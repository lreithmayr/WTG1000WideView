/// <reference types="@microsoft/msfs-types/js/avionics" />

import {
    BlurReconciliation,
    EventBus,
    FlightPlanSegment,
    FlightPlanSegmentType,
    FSComponent,
    Subject,
    VNode
} from '@microsoft/msfs-sdk';
import {
    FlightPlanFocus,
    FlightPlanSelection,
    FplActiveLegArrow,
    FPLDetails,
    FPLSection,
    G1000ControlList,
    G1000UiControlProps,
    GroupBox,
    ScrollBar,
    ViewService
} from '@microsoft/msfs-wtg1000';
import {FPLWideOrigin} from './FPLWideSectionOrigin';
import {FPLWideApproach} from "./FPLSectionApproach";
import {FPLWideArrival} from "./FPLSectionArrival";
import {FPLWideDeparture} from "./FPLSectionDeparture";
import {FPLWideDestination} from "./FPLSectionDestination";
import {FPLWideEnroute} from "./FPLSectionEnroute";
import {Fms} from '@microsoft/msfs-garminsdk';

export interface MFDFPLWideDetailProps extends G1000UiControlProps {
    /** The event bus for flight plan events. */
    bus: EventBus;

    /** The view service. */
    viewService: ViewService;

    /** An FMS state manager. */
    fms: Fms;

    /** A subject to provide the selected flight plan element. */
    selection: Subject<FlightPlanSelection>;

    /** A subject to provide the flight plan focus. */
    focus: Subject<FlightPlanFocus>;
}

/** Component props for MFDFPLDetails */
export class MFDFPLWideDetails extends FPLDetails<MFDFPLWideDetailProps> {
    protected isExtendedView = true;

    constructor(props: MFDFPLWideDetailProps) {
        super(props);
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

    protected override renderItem(data: FlightPlanSegment, index: number): VNode {
        let section;
        const fplSectionRef = FSComponent.createRef<FPLSection>()
        switch (data.segmentType) {
            case FlightPlanSegmentType.Departure:
                section = (
                    <FPLWideDeparture
                        ref={fplSectionRef}
                        bus={this.props.bus}
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
                section = (
                    <FPLWideArrival
                        ref={fplSectionRef}
                        bus={this.props.bus}
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
                section = (
                    <FPLWideApproach
                        ref={fplSectionRef}
                        bus={this.props.bus}
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
                section = (
                    <FPLWideDestination
                        ref={fplSectionRef}
                        bus={this.props.bus}
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
            default:
                section = (
                    <FPLWideEnroute
                        ref={fplSectionRef}
                        bus={this.props.bus}
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
                                              class="smallText white">DTK</span></td>
                                    <td><span id="wide-cum-dis"
                                              class="smallText white">CUM DIS</span></td>
                                    <td><span id="wide-alt"
                                              class="smallText white">ALT</span></td>
                                    <td><span id="wide-fuel-rem"
                                              class="smallText white">Fuel REM</span></td>
                                    <td><span id="wide-cum-ete"
                                              class="smallText white">CUM ETE</span></td>
                                    <td><span id="wide-eta"
                                              class="smallText white">ETA</span></td>
                                    <td><span id="wide-brg"
                                              class="smallText white">BRG</span></td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                        <hr class="mfd-flightplan-wide-hr"/>
                        <div class='mfd-fpln-wide-container'
                             style={"height:190px"}
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
