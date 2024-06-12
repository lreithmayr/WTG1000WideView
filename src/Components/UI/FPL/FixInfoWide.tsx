import {
    BitFlags,
    ComputedSubject,
    ConsumerSubject,
    EventBus,
    FacilityType,
    FixTypeFlags,
    FlightPlanSegmentType,
    FlightPlanUtils,
    FSComponent,
    GNSSEvents,
    ICAO,
    LegDefinitionFlags,
    LegType,
    MappedSubject,
    Subject,
    UnitType,
    VNode
} from '@microsoft/msfs-sdk';

import {
    ConstraintSelector,
    FixLegInfo,
    FuelSimVars,
    FuelTotalizerSimVars,
    G1000UiControl,
    G1000UiControlProps,
    UiControl,
    ViewService
} from '@microsoft/msfs-wtg1000';
import {Fms} from "@microsoft/msfs-garminsdk";

/**
 * The properties for the FixInfo component.
 */
interface FixInfoWideProps extends G1000UiControlProps {
    /** The event bus for flight plan events. */
    bus: EventBus;

    /** An FMS state manager. */
    fms: Fms;

    /**
     * The actual data object for this fix
     * @type {Subject<FixLegInfo>}
     */
    data: Subject<FixLegInfo>;

    /** An instance of the view service. */
    viewService: ViewService;

    /** A callback called when a user changes the VNAV altitude. */
    onAltitudeChanged: (altitude: number) => void;

    /** A callback called when an altitude is removed. */
    onAltitudeRemoved: () => void;

    /** A callback called to get the active leg distance remaining. */
    getActiveLegDistance: () => number;

    /** A callback called to get the active leg desired track. */
    getActiveLegDtk: () => number;
}

// noinspection JSUnusedGlobalSymbols
/** The FixInfo component. */
export class FixInfoWide extends G1000UiControl<FixInfoWideProps> {

    private static viewableLegTypes = [LegType.AF, LegType.CF, LegType.DF, LegType.IF, LegType.RF, LegType.TF];

    private readonly fixElementRef = FSComponent.createRef<HTMLDivElement>();
    private readonly highlightElementRef = FSComponent.createRef<HTMLSpanElement>();
    private readonly altitudeRef = FSComponent.createRef<HTMLDivElement>();
    private readonly ACTIVE_WPT_CLASS = 'active-wpt';

    private readonly isUserConstraint = Subject.create<boolean>(false);
    private readonly hasInvalidAltitude = Subject.create<boolean>(false);
    private readonly isAltitudeHidden = Subject.create<boolean>(false);

    private readonly gsKTS = ConsumerSubject.create(this.props.bus.getSubscriber<GNSSEvents>().on('ground_speed'), 0);
    private readonly distToFixNM = Subject.create(this.props.data.get().legDefinition.calculated?.cumulativeDistanceWithTransitions ?? -1);
    private readonly fuelFlowPPH = ConsumerSubject.create(this.props.bus.getSubscriber<FuelSimVars>().on('fuelFlow1'), 0);
    private readonly totalFuelLBS = ConsumerSubject.create(this.props.bus.getSubscriber<FuelTotalizerSimVars>().on('remainingFuel'), 0);

    private _fuelRemLBS = MappedSubject.create(
        ([gsKTS, distToFixNM, fuelFlowPPH, totalFuelLBS]): string => {
            if (this.props.data.get().legIsBehind) {
                return '_____';
            }
            else if (distToFixNM >= 0 && gsKTS > 30 && fuelFlowPPH > 0) {
                let fuelRemaining = totalFuelLBS - (distToFixNM / gsKTS) * fuelFlowPPH;
                return Math.round(fuelRemaining).toFixed(0);
            } else {
                return '_____';
            }
        },
        this.gsKTS,
        this.distToFixNM,
        this.fuelFlowPPH,
        this.totalFuelLBS
    );

    private _dtk = ComputedSubject.create(this.props.data.get().legDefinition.calculated?.initialDtk ?? -1, (v): string => {
        if (v < 0 || this.props.data.get().legIsBehind) {
            return '___';
        } else {
            const rounded = Math.round(v);
            return (rounded === 0 ? 360 : rounded).toFixed(0).padStart(3, '0');
        }
    });


    private _cumDistance = ComputedSubject.create(this.props.data.get().legDefinition.calculated?.cumulativeDistance ?? -1, (v): string => {
        if (v < 0.1 || this.props.data.get().legIsBehind) {
            return '____';
        } else {
            const dis = UnitType.METER.convertTo(v, UnitType.NMILE);
            return dis.toFixed((dis < 100) ? 1 : 0);
        }
    });

    private _altitude = Subject.create(Math.round(UnitType.METER.convertTo(this.props.data.get().targetAltitude ?? -1, UnitType.FOOT)));

    private _altitudeUnits = ComputedSubject.create(this.props.data.get().targetAltitude ?? -1, (v): string => {
        if (v < 1 || isNaN(v) || this.props.data.get().legIsBehind) {
            return ' ';
        } else {
            return 'FT';
        }
    });

    private _fixType = ComputedSubject.create(this.props.data.get().legDefinition.leg.fixTypeFlags ?? FixTypeFlags.None, (v): string => {
        const leg = this.props.data.get().legDefinition;
        if (leg.name === 'MANSEQ' && (leg.leg.type === LegType.FM || leg.leg.type === LegType.VM)) {
            return ' hdg';
        }
        switch (v) {
            case FixTypeFlags.FAF:
                return ' faf';
            case FixTypeFlags.IAF:
                return ' iaf';
            case FixTypeFlags.MAP:
                return ' map';
            case FixTypeFlags.MAHP:
                return ' mahp';
            default:
                return '';
        }
    });
    /**
     * Sets the leg distance.
     * @param leg The FixLegInfo Object
     */
    private setDistance(leg: FixLegInfo): void {
        if (leg.isActive) {
            this._cumDistance.set(this.props.getActiveLegDistance());
        } else if (leg.isAirwayExitFix && leg.isCollapsed) {
            this._cumDistance.set(leg.airwayDistance ?? -1);
        } else if (leg.legDefinition.leg.type === LegType.HF || leg.legDefinition.leg.type === LegType.HM || leg.legDefinition.leg.type === LegType.HA) {
            const lastVectorIndex = leg.legDefinition.calculated?.flightPath.length ? leg.legDefinition.calculated?.flightPath.length - 1 : 0;
            this._cumDistance.set(leg.legDefinition.calculated?.flightPath[lastVectorIndex].distance ?? 0);
        } else {
            this._cumDistance.set(leg.legDefinition.calculated?.cumulativeDistanceWithTransitions ?? 0);
        }
    }

    /**
     * Resets highlight animation when the leg goes to/from active so the right color variable is used.
     * We need to trigger a reflow so the browser parses the animation again.
     */
    private resetHighlightAnimation(): void {
        const animName = this.highlightElementRef.instance.style.animationName;
        this.highlightElementRef.instance.style.animationName = 'none';
        this.highlightElementRef.instance.offsetHeight;
        this.highlightElementRef.instance.style.animationName = animName;
    }

    /**
     * Gets the container element location
     * @returns An array of x,y.
     */
    public getContainerElementLocation(): [number, number] {
        return [this.fixElementRef.instance.offsetLeft, this.fixElementRef.instance.offsetTop];
    }

    /** @inheritdoc */
    public getHighlightElement(): Element | null {
        return this.highlightElementRef.instance;
    }

    /** @inheritdoc */
    public onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        this.props.data.sub((v) => {
            if (v.isActive) {
                this._dtk.set(this.props.getActiveLegDtk());
            } else if (v.isAirwayExitFix && v.isCollapsed) {
                this._dtk.set(-1);
            } else if (v.legDefinition.leg.type === LegType.HF || v.legDefinition.leg.type === LegType.HM || v.legDefinition.leg.type === LegType.HA) {
                this._dtk.set(v.legDefinition.leg.course);
            } else {
                this._dtk.set(v.legDefinition.calculated?.initialDtk ?? -1);
            }
            const altitude = Math.round(UnitType.METER.convertTo(v.invalidConstraintAltitude ?? v.targetAltitude ?? -1, UnitType.FOOT));

            this.setDistance(v);

            if (v.isActive) {
                this.fixElementRef.instance.classList.add(this.ACTIVE_WPT_CLASS);
                this.highlightElementRef.instance.classList.remove('fix-hold');
            } else {
                this.fixElementRef.instance.classList.remove(this.ACTIVE_WPT_CLASS);
            }

            if (this.isFocused) {
                this.resetHighlightAnimation();
            }

            if (
                (v.isCollapsed && !v.isAirwayExitFix)
                || FlightPlanUtils.isDiscontinuityLeg(v.legDefinition.leg.type)
                || BitFlags.isAny(v.legDefinition.flags, LegDefinitionFlags.DirectTo)
            ) {
                this.setIsVisible(false);
                this.setDisabled(true);
            } else {
                this.setIsVisible(true);
                this.setDisabled(false);
            }

            if (v.isAirwayFix) {
                this.highlightElementRef.instance.style.marginLeft = v.isAirwayExitFix ? '5px' : '10px';
            } else {
                this.highlightElementRef.instance.style.marginLeft = '0px';
            }

            this._fixType.set(v.legDefinition.leg.fixTypeFlags ?? FixTypeFlags.None);

            if (v.legDefinition.leg.type === LegType.HF || v.legDefinition.leg.type === LegType.HM || v.legDefinition.leg.type === LegType.HA) {
                this.highlightElementRef.instance.classList.add('fix-hold');
            } else {
                this.highlightElementRef.instance.classList.remove('fix-hold');
            }

            if (v.isUserConstraint) {
                this.isUserConstraint.set(true);
            } else {
                this.isUserConstraint.set(false);
            }

            if (v.legIsBehind || v.segmentType === FlightPlanSegmentType.Origin || v.segmentType === FlightPlanSegmentType.Departure
                || v.legDefinition.leg.fixIcao[0] === 'R' || BitFlags.isAll(v.legDefinition.flags, LegDefinitionFlags.MissedApproach)) {
                this.isAltitudeHidden.set(true);
            } else {
                this.isAltitudeHidden.set(false);

                this._altitudeUnits.set(v.targetAltitude ?? -1);

                if (v.isAdvisory && v.invalidConstraintAltitude === undefined) {
                    this.altitudeRef.instance.classList.add('alt-advisory');
                    if (altitude <= 0) {
                        this._altitude.set(0);
                    } else {
                        this._altitude.set(altitude);
                    }
                } else {
                    this.altitudeRef.instance.classList.remove('alt-advisory');
                    this._altitude.set(altitude);
                }
                if (v.invalidConstraintAltitude !== undefined) {
                    this.hasInvalidAltitude.set(true);
                } else {
                    this.hasInvalidAltitude.set(false);
                }
            }
            this._fuelRemLBS.resume();
        });
    }

    /** @inheritdoc */
    public onEnter(): boolean {
        const leg = this.props.data.get().legDefinition.leg;
        if (FixInfoWide.viewableLegTypes.indexOf(leg.type) >= 0) {
            try {
                const facilityType = ICAO.getFacilityType(leg.fixIcao);
                switch (facilityType) {
                    case FacilityType.Airport:
                        this.props.viewService.open('AirportInformation').setInput(leg.fixIcao);
                        return true;
                    case FacilityType.Intersection:
                        this.props.viewService.open('IntersectionInformation').setInput(leg.fixIcao);
                        return true;
                    case FacilityType.VOR:
                        this.props.viewService.open('VorInformation').setInput(leg.fixIcao);
                        return true;
                    case FacilityType.NDB:
                        this.props.viewService.open('NdbInformation').setInput(leg.fixIcao);
                        return true;
                }
            } catch { /* Continue */
            }
        }

        return false;
    }

    /**
     * Sets whether or not the FixInfo control is visible.
     * @param isVisible Whether or not the control is visible.
     */
    private setIsVisible(isVisible: boolean): void {
        if (isVisible) {
            this.fixElementRef.instance.classList.remove(UiControl.HIDE_CLASS);
        } else {
            this.fixElementRef.instance.classList.add(UiControl.HIDE_CLASS);
        }
    }

    /** @inheritdoc */
    protected onNameFocused(): void {
        this.highlightElementRef.instance.classList.add(UiControl.FOCUS_CLASS);
    }

    /** @inheritdoc */
    protected onNameBlurred(): void {
        this.highlightElementRef.instance.classList.remove(UiControl.FOCUS_CLASS);
    }

    /** @inheritdoc */
    render(): VNode {
        return (
            <div class='fix-container'
                 ref={this.fixElementRef}>
                <G1000UiControl onFocused={this.onNameFocused.bind(this)}
                                onBlurred={this.onNameBlurred.bind(this)}>
                    <div class='fix-name'>
                        <span ref={this.highlightElementRef}>{this.props.data.get().legDefinition.name}<span class='fix-type'>{this._fixType}</span></span>
                    </div>
                </G1000UiControl>
                <div class='mfd-dtk-value'>
                    {this._dtk}°
                </div>
                <div class='mfd-dis-value'>
                    {this._cumDistance}
                    <span class="smallText">
                        NM
                    </span>
                </div>
                <div ref={this.altitudeRef}
                     class='mfd-alt-value'>
                    <ConstraintSelector data={this._altitude}
                                        onSelected={(a): void => this.props.onAltitudeChanged(a)}
                                        isHidden={this.isAltitudeHidden}
                                        onRemoved={(): void => this.props.onAltitudeRemoved()}
                                        isEdited={this.isUserConstraint}
                                        isInvalid={this.hasInvalidAltitude}/>
                </div>
                <div class='mfd-fuelrem-value'>
                    {this._fuelRemLBS}
                    <span class="smallText">
                        LB
                    </span>
                </div>
            </div>
        );
    }
}
