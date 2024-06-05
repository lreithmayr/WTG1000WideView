import {
    EventBus,
    FacilityLoader,
    FacilityRepository,
    FocusPosition,
    FSComponent,
    Subject,
    VNode
} from '@microsoft/msfs-sdk';

import {Fms} from '@microsoft/msfs-garminsdk';

import {
    FmsHEvent, FlightPlanFocus, FlightPlanSelection, G1000UiControl, G1000UiControlProps, ViewService, GroupBox,
    MFDFPLVNavProfile, MFDFPLWeather
} from '@microsoft/msfs-wtg1000';

import {MFDFPLWideDetails} from './MFDFPLWideDetails';

import './MFDFPLWide.css';

/**
 * Component props for MFDFPLWide.
 */
export interface MFDFPLWideProps extends G1000UiControlProps {
    /** An instance of the event bus. */
    bus: EventBus;

    /** The view service. */
    viewService: ViewService;

    /** The flight management system. */
    fms: Fms;

    /** A subject to provide the flight plan focus. */
    focus: Subject<FlightPlanFocus>;
}

/**
 * The FPL popup container encapsulates the actual popup logic.
 */
export class MFDFPLWide extends G1000UiControl<MFDFPLWideProps> {
    private readonly fplDetailsRef = FSComponent.createRef<MFDFPLWideDetails>();
    private readonly vnavProfileRef = FSComponent.createRef<MFDFPLVNavProfile>();

    private readonly selectionSub = Subject.create<FlightPlanSelection>(null);

    /** Called when the view is resumed. */
    public onViewResumed(): void {
        this.fplDetailsRef.instance.fplViewResumed();
    }

    /** Called when the view is opened. */
    public onViewOpened(): void {
        this.fplDetailsRef.instance.fplViewOpened();
        this.vnavProfileRef.instance.resume();
    }

    /** Called when the view is closed. */
    public onViewClosed(): void {
        this.vnavProfileRef.instance.pause();
    }

    /** @inheritdoc */
    protected onBlurred(): void {
        this.selectionSub.set(null);
    }

    /**
     * Scrolls to the active leg in the flight plan.
     * @param focusActiveLeg Whether to focus the active leg.
     */
    public scrollToActiveLeg(focusActiveLeg: boolean): void {
        this.fplDetailsRef.instance.scrollToActiveLeg(focusActiveLeg);
    }

    /** @inheritdoc */
    public onInteractionEvent(evt: FmsHEvent): boolean {
        if (!this.isFocused && evt === FmsHEvent.MENU) {
            return this.fplDetailsRef.instance.openDetailsMenu();
        }

        return super.onInteractionEvent(evt);
    }

    /**
     * Renders the component.
     * @returns The component VNode.
     */
    public render(): VNode {
        return (
            <div class='mfd-fpl-wide'>
                <MFDFPLWideDetails
                    ref={this.fplDetailsRef} bus={this.props.bus}
                    viewService={this.props.viewService} fms={this.props.fms}
                    selection={this.selectionSub} focus={this.props.focus}

                    // Focus the last focused control if scrolling in from the Active VNAV Profile box.
                    getFocusPositionOnScroll={(direction): FocusPosition => direction === 'backward' ? FocusPosition.MostRecent : FocusPosition.First}
                />
                <div class='mfd-dark-background-wide-bottom'>
                    <GroupBox title="Active VNV Profile">
                        <MFDFPLVNavProfile ref={this.vnavProfileRef} bus={this.props.bus}
                                           flightPlanner={this.props.fms.flightPlanner} fms={this.props.fms}/>
                    </GroupBox>
                    <GroupBox title="Selected Waypoint Weather">
                        <MFDFPLWeather facLoader={new FacilityLoader(FacilityRepository.getRepository(this.props.bus))}
                                       fms={this.props.fms} selection={this.selectionSub}/>
                    </GroupBox>
                    <div class="mfd-fpl-wide-bottom-prompt">Press the "FPL" key to view the previous page</div>
                </div>
            </div>
        );
    }
}
