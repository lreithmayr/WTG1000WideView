import {
    FixLegInfo,
    FPLDeparture,
    FPLEmptyRow,
    FPLHeaderDeparture,
    FPLSectionProps,
    G1000ControlList,
    G1000UiControlProps,
    MessageDialogDefinition
} from "@microsoft/msfs-wtg1000";
import {
    BlurReconciliation,
    EventBus,
    FSComponent,
    NumberUnitSubject,
    Subject,
    UnitType,
    VNode
} from "@microsoft/msfs-sdk";
import {
    FmsUtils,
    NumberUnitDisplay
} from "@microsoft/msfs-garminsdk";
import {FixInfoWide} from "./FixInfoWide";

export interface FPLWideSectionProps extends FPLSectionProps {
    /** The event bus for flight plan events. */
    bus: EventBus;
}

export class FPLWideDeparture<P extends FPLWideSectionProps = FPLWideSectionProps> extends FPLDeparture {
    private readonly eventBus: EventBus;

    constructor(props: P) {
        super(props);
        this.eventBus = props.bus;
    }

    /**
     * A method called to get the offset leg index if there is a direct to in the segment.
     * @param index The leg index within the segment.
     * @returns The correct segment leg index for this leg.
     */
    getSegmentLegIndex(index: number): number {
        const plan = this.props.fms.getPrimaryFlightPlan();
        const directToData = plan.directToData;

        if (this.segment.segmentIndex === directToData.segmentIndex && index === directToData.segmentLegIndex) {
            return index + FmsUtils.DTO_LEG_OFFSET;
        }

        return index;
    }

    /**
     * A callback called when a user constraint is set on a leg.
     * @param index The leg index within the segment.
     * @param alt The altitude to set the user constraint.
     */
    _onAltitudeSet(index: number, alt: number): void {
        const displayLeg = this.legs.tryGet(index)?.get();
        if (!displayLeg) {
            return;
        }
        this.props.fms.setUserConstraint(this.segment.segmentIndex, this.getSegmentLegIndex(index), alt);
    }

    /**
     * A callback called when a user constraint is removed from a leg.
     * @param index The leg index within the segment.
     */
    _onAltitudeRemoved(index: number): void {
        const displayLeg = this.legs.tryGet(index)?.get();
        if (!displayLeg || (displayLeg.isAdvisory && displayLeg.invalidConstraintAltitude === undefined)) {
            return;
        }
        index = this.getSegmentLegIndex(index);

        const lateralLeg = this.props.fms.getPrimaryFlightPlan().tryGetLeg(this.segment.segmentIndex, index);
        const underlyingConstraint = this.props.fms.hasConstraint(this.segment.segmentIndex, index);
        const isUserConstraint = lateralLeg !== null ? FmsUtils.isLegAltitudeEdited(lateralLeg, false) : false;
        if (underlyingConstraint !== undefined && isUserConstraint) {
            const altitudeNumber = NumberUnitSubject.create(UnitType.FOOT.createNumber(underlyingConstraint));
            const unit = Subject.create(UnitType.FOOT);

            const input: MessageDialogDefinition = {
                renderContent: (): VNode =>
                    <>
                        <span>{'Remove or Revert to published VNV altitude of '}</span>
                        <NumberUnitDisplay class='altitude-question-display'
                                           formatter={(v): string => v.toFixed(0)}
                                           value={altitudeNumber}
                                           displayUnit={unit}/>
                        <span>?</span>
                    </>,
                confirmButtonText: 'REMOVE',
                hasRejectButton: true,
                rejectButtonText: 'REVERT'
            };

            this.props.viewService.open('MessageDialog', true).setInput(input).onAccept.on((sender, accept) => {
                if (accept) {
                    this.props.fms.setUserConstraint(this.segment.segmentIndex, index);
                    this.legs.get(index).apply({isAdvisory: true});
                } else {
                    this.props.fms.revertAltitudeConstraint(this.segment.segmentIndex, index);
                    this.legs.get(index).apply({targetAltitude: UnitType.FOOT.convertTo(underlyingConstraint, UnitType.METER)});
                }

                this.legs.get(index).apply({isUserConstraint: false});
            });
        } else if (isUserConstraint || !displayLeg.isAdvisory) {
            const input: MessageDialogDefinition = {
                inputString: 'Remove VNV altitude?',
                confirmButtonText: 'OK',
                hasRejectButton: true,
                rejectButtonText: 'CANCEL'
            };

            this.props.viewService.open('MessageDialog', true).setInput(input).onAccept.on((sender, accept) => {
                if (accept) {
                    this.props.fms.setUserConstraint(this.segment.segmentIndex, index);
                    this.legs.get(index).apply({isUserConstraint: false});
                    this.legs.get(index).apply({isAdvisory: true});
                }
            });
        }
    }

    /**
     * Renders this section's list of flight plan legs.
     * @returns This section's list of flight plan legs, as a VNode.
     */
    protected renderLegList(): VNode {
        return (
            <G1000ControlList
                ref={this.listRef}
                data={this.legs}
                renderItem={this.renderItem}
                onItemSelected={this.onLegItemSelected.bind(this)}
                hideScrollbar
                scrollToMostRecentlyAdded
                scrollContainer={this.props.scrollContainer}
                reconcileChildBlur={(): BlurReconciliation => BlurReconciliation.Next}
                requireChildFocus
            />
        );
    }

    /**
     * Renders a Leg in the flight plan.
     * @param data The data object for this leg.
     * @returns The rendered VNode.
     */
    protected renderItem = (data: Subject<FixLegInfo>): VNode => {
        return <FixInfoWide onUpperKnobInc={this.onUpperKnobLeg}
                            onClr={this.onClrLeg}
                            bus={this.eventBus}
                            fms={this.props.fms}
                            data={data}
                            viewService={this.props.viewService}
                            onAltitudeChanged={(alt: number): void => this._onAltitudeSet(this.listRef.instance.getSelectedIndex(), alt)}
                            onAltitudeRemoved={(): void => this._onAltitudeRemoved(this.listRef.instance.getSelectedIndex())}
                            getActiveLegDistance={(): number => this.getActiveLegDistance()}
                            getActiveLegDtk={(): number => this.getActiveLegDtk()}/>;
    };

    /**
     * Render the departure section.
     * @returns A VNode.
     */
    public render(): VNode {
        return (
            <div id='fpln-departure'>
                <FPLHeaderDeparture
                    ref={this.headerRef}
                    facilities={this.props.facilities}
                    fms={this.props.fms}
                    segment={this.segment}
                    onClr={this.onClrHeader}
                    onFocused={this.onHeaderFocused.bind(this)}
                    scrollContainer={this.props.scrollContainer}
                />
                {this.renderLegList()}
                <FPLEmptyRow
                    ref={this.emptyRowRef}
                    onUpperKnobInc={this.onUpperKnobEmptyRow}
                    onFocused={this.onEmptyRowFocused.bind(this)}
                    scrollContainer={this.props.scrollContainer}
                />
            </div>
        );
    }

}
