import {BlurReconciliation, FSComponent, Subject, VNode} from '@microsoft/msfs-sdk';
import {
    G1000ControlList, ScrollBar, FplActiveLegArrow, GroupBox,
    FlightPlanSelection, FlightPlanFocus, FPLDetailProps, FPLDetails
} from '@microsoft/msfs-wtg1000';
import {FPLWideOrigin} from './FPLWideSectionOrigin';

/** Component props for MFDFPLDetails */
export interface MFDFPLWideDetailProps extends FPLDetailProps {
    /** A subject to provide the selected flight plan element. */
    selection: Subject<FlightPlanSelection>;

    /** A subject to provide the flight plan focus. */
    focus: Subject<FlightPlanFocus>;
}

export class MFDFPLWideDetails extends FPLDetails<MFDFPLWideDetailProps> {
    public isExtendedView = true;

    /** Called when the fpl view is opened. */
    public fplViewOpened(): void {
        // super.fplViewOpened(false);

        this.controller.legArrowRef.instance.updateArrows(this.store.activeLegState.get(), this.store.activeLeg.get(), this.props.fms.getFlightPlan());
    }

    /** @inheritdoc */
    protected onFlightPlanElementSelected(selection: FlightPlanSelection): void {
        this.props.selection.set(selection);
    }

    /** @inheritdoc */
    protected onFlightPlanFocusSelected(focus: FlightPlanFocus): void {
        this.props.focus.set(focus);
    }

    public render(): VNode {
        return (
            <div class='mfd-dark-background-wide-top'>
                <div ref={this.fplDetailsContainer}>
                    <GroupBox title="Active Flight Plan" class='mfd-fpl-wide-plan-box'>
                        <FPLWideOrigin ref={this.controller.originRef}/>
                        <br/>
                        <div>
                            <span id="wide-dtk" class="smallText white">DTK</span>
                            <span id="wide-dis" class="smallText white">DIS</span>
                            <span id="wide-alt" class="smallText white">ALT</span>
                        </div>
                        <hr class="mfd-flightplan-wide-hr"/>
                        <div class='mfd-fpln-wide-container' style={"height:200px"} ref={this.fplnContainer}>
                            <G1000ControlList
                                ref={this.sectionListRef} data={this.store.segments}
                                renderItem={this.renderItem.bind(this)}
                                reconcileChildBlur={(): BlurReconciliation => BlurReconciliation.Next}
                                requireChildFocus
                            />
                            <FplActiveLegArrow ref={this.controller.legArrowRef}
                                               getLegDomLocation={this.getListElementTopLocation}/>
                        </div>
                        <ScrollBar/>
                    </GroupBox>
                </div>
            </div>
        );
    }
}
