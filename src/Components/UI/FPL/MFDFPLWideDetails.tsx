import {
    BlurReconciliation,
    FlightPlanSegment,
    FlightPlanSegmentType,
    FSComponent, Subject,
    VNode
} from '@microsoft/msfs-sdk';
import {
    G1000ControlList,
    ScrollBar,
    FplActiveLegArrow,
    GroupBox,
    FlightPlanSelection,
    FlightPlanFocus,
    FPLDetailProps,
    FPLDetails,
    FPLSection,
    FPLDeparture,
    FPLDestination,
    FPLApproach,
    FPLArrival,
    FPLEnroute
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

    public onAfterRender(thisNode: VNode) {
        super.onAfterRender(thisNode);
    }

    /** Called when the fpl view is opened. */
    public fplViewOpened(): void {
        super.fplViewOpened(false);

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

    /**
     * Renders a section in the flight plan.
     * @param data The data object for this section.
     * @param index The index.
     * @returns The rendered VNode.
     */
    protected renderItem(data: FlightPlanSegment, index: number): VNode {
        let section;
        const ref = FSComponent.createRef<FPLSection>();
        // select datatemplate
        switch (data.segmentType) {
            case FlightPlanSegmentType.Departure:
                console.log(`Rendering ${data.segmentType.toString()}!`);
                console.log(`No of legs: ${data.legs.length}`)
                section = (
                    <FPLDeparture
                        ref={ref}
                        viewService={this.props.viewService}
                        fms={this.props.fms}
                        detailsController={this.controller}
                        facilities={this.store.facilityInfo}
                        segment={data}
                        isExtendedView={this.isExtendedView}
                        scrollContainer={this.fplnContainer}
                        onRegistered={this.sectionRegisteredHandler}
                        onFlightPlanElementSelected={this.flightPlanElementSelectedHandler}
                        onFlightPlanFocusSelected={this.flightPlanFocusSelectedHandler}
                        reconcileChildBlur={(): BlurReconciliation => BlurReconciliation.Next}
                        requireChildFocus
                    />
                );
                break;
            case FlightPlanSegmentType.Arrival:
                console.log(`Rendering ${data.segmentType.toString()}!`);
                console.log(`No of legs: ${data.legs.length}`)
                section = (
                    <FPLArrival
                        ref={ref}
                        viewService={this.props.viewService}
                        fms={this.props.fms}
                        detailsController={this.controller}
                        facilities={this.store.facilityInfo}
                        segment={data}
                        isExtendedView={this.isExtendedView}
                        scrollContainer={this.fplnContainer}
                        onRegistered={this.sectionRegisteredHandler}
                        onFlightPlanElementSelected={this.flightPlanElementSelectedHandler}
                        onFlightPlanFocusSelected={this.flightPlanFocusSelectedHandler}
                        reconcileChildBlur={(): BlurReconciliation => BlurReconciliation.Next}
                        requireChildFocus
                    />
                );
                break;
            case FlightPlanSegmentType.Approach:
                console.log(`Rendering ${data.segmentType.toString()}!`);
                console.log(`No of legs: ${data.legs.length}`)
                section = (
                    <FPLApproach
                        ref={ref}
                        viewService={this.props.viewService}
                        fms={this.props.fms}
                        detailsController={this.controller}
                        facilities={this.store.facilityInfo}
                        segment={data}
                        isExtendedView={this.isExtendedView}
                        scrollContainer={this.fplnContainer}
                        onRegistered={this.sectionRegisteredHandler}
                        onFlightPlanElementSelected={this.flightPlanElementSelectedHandler}
                        onFlightPlanFocusSelected={this.flightPlanFocusSelectedHandler}
                        reconcileChildBlur={(): BlurReconciliation => BlurReconciliation.Next}
                        requireChildFocus
                    />
                );
                break;
            case FlightPlanSegmentType.Destination:
                console.log(`Rendering ${data.segmentType.toString()}!`);
                console.log(`No of legs: ${data.legs.length}`)
                section = (
                    <FPLDestination
                        ref={ref}
                        viewService={this.props.viewService}
                        fms={this.props.fms}
                        detailsController={this.controller}
                        facilities={this.store.facilityInfo}
                        segment={data}
                        isExtendedView={this.isExtendedView}
                        scrollContainer={this.fplnContainer}
                        onRegistered={this.sectionRegisteredHandler}
                        onFlightPlanElementSelected={this.flightPlanElementSelectedHandler}
                        onFlightPlanFocusSelected={this.flightPlanFocusSelectedHandler}
                        reconcileChildBlur={(): BlurReconciliation => BlurReconciliation.Next}
                        requireChildFocus
                    />
                );
                console.log(`Legs ${section.legs}`);
                break;
            default:
                console.log(`Rendering ${data.segmentType.toString()}!`);
                section = (
                    <FPLEnroute
                        ref={ref}
                        viewService={this.props.viewService}
                        fms={this.props.fms}
                        detailsController={this.controller}
                        facilities={this.store.facilityInfo}
                        segment={data}
                        isExtendedView={this.isExtendedView}
                        scrollContainer={this.fplnContainer}
                        onRegistered={this.sectionRegisteredHandler}
                        onFlightPlanElementSelected={this.flightPlanElementSelectedHandler}
                        onFlightPlanFocusSelected={this.flightPlanFocusSelectedHandler}
                        reconcileChildBlur={(): BlurReconciliation => BlurReconciliation.Next}
                        requireChildFocus
                    />
                );
        }
        this.controller.sectionRefs.splice(index, 0, section);
        return section;
    }

    /**
     * Render the component.
     * @returns The component VNode.
     */
    public render(): VNode {
        return (
            <div class='mfd-dark-background-wide-top'>
                <div ref={this.fplDetailsContainer}>
                    <GroupBox title="Active Flight Plan"
                              class='mfd-fpl-wide-plan-box'>
                        <FPLWideOrigin
                            ref={this.controller.originRef}/>
                        <br/>
                        <div>
                            <table>
                                <tbody>
                                <tr>
                                    <td><span id="wide-dtk"
                                              className="smallText white">DTK</span></td>
                                    <td><span id="wide-dis"
                                              className="smallText white">DIS</span></td>
                                    <td><span id="wide-alt"
                                              className="smallText white">ALT</span></td>
                                    <td><span id="wide-fuel-rem"
                                              className="smallText white">Fuel REM</span></td>
                                    <td><span id="wide-ete"
                                              className="smallText white">ETE</span></td>
                                    <td><span id="wide-eta"
                                              className="smallText white">ETA</span></td>
                                    <td><span id="wide-brg"
                                              className="smallText white">BRG</span></td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                        <hr class="mfd-flightplan-wide-hr"/>
                        <div class='mfd-fpln-wide-container'
                             style={"height:200px"}
                             ref={this.fplnContainer}>
                            <G1000ControlList
                                ref={this.sectionListRef}
                                data={this.store.segments}
                                renderItem={this.renderItem.bind(this)}
                                reconcileChildBlur={(): BlurReconciliation => BlurReconciliation.Next}
                                requireChildFocus
                            />
                            <FplActiveLegArrow
                                ref={this.controller.legArrowRef}
                                getLegDomLocation={this.getListElementTopLocation}/>
                        </div>
                        <ScrollBar/>
                    </GroupBox>
                </div>
            </div>
        );
    }
}
