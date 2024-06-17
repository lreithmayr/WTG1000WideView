import {
    BitFlags,
    ClockEvents,
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
    LNavDataEvents,
    MappedSubject,
    Subject,
    UnitType,
    VNode
} from '@microsoft/msfs-sdk';

import {
    ConstraintSelector,
    FixLegInfo,
    FuelSimVars,
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

    getActiveLegIndex: () => number;
}

// let DEBUG: boolean = false;

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
    private readonly fuelFlowGPH = ConsumerSubject.create(this.props.bus.getSubscriber<FuelSimVars>().on('fuelFlow1'), 0);
    private readonly totalFuelGAL = ConsumerSubject.create(this.props.bus.getSubscriber<FuelSimVars>().on('fuelQty'), 0);
    private readonly simTime = ConsumerSubject.create(this.props.bus.getSubscriber<ClockEvents>().on('simTime'), 0);
    private readonly activeLegBearing = ConsumerSubject.create(this.props.bus.getSubscriber<LNavDataEvents>().on('lnavdata_dtk_mag'), 0);
    private readonly currentLNavWpt = ConsumerSubject.create(this.props.bus.getSubscriber<LNavDataEvents>().on('lnavdata_waypoint_ident'), null)

    private _cumulativeDistance = MappedSubject.create(
        ([leg, currentLNavWpt]): string => {
            if (leg.legIsBehind || (leg.legDefinition.calculated?.distance ?? -1) < 0.1) {
                if (leg.isActive || leg.legDefinition.name === currentLNavWpt) {
                    window.legCumulativeDist = UnitType.METER.convertTo(this.props.getActiveLegDistance(), UnitType.NMILE);
                    return '____';
                }
                return '____';
            } else {
                if (leg.isActive || leg.legDefinition.name === currentLNavWpt) {
                    window.legCumulativeDist = UnitType.METER.convertTo(this.props.getActiveLegDistance(), UnitType.NMILE);
                } else if (leg.isAirwayExitFix && leg.isCollapsed) {
                    window.legCumulativeDist += UnitType.METER.convertTo(leg.airwayDistance ?? -1, UnitType.NMILE);
                } else if (leg.legDefinition.leg.type === LegType.HF || leg.legDefinition.leg.type === LegType.HM || leg.legDefinition.leg.type === LegType.HA) {
                    const lastVectorIndex = leg.legDefinition.calculated?.flightPath.length ? leg.legDefinition.calculated?.flightPath.length - 1 : 0;
                    window.legCumulativeDist += UnitType.METER.convertTo(leg.legDefinition.calculated?.flightPath[lastVectorIndex].distance ?? 0, UnitType.NMILE);
                } else {
                    window.legCumulativeDist += UnitType.METER.convertTo((leg.legDefinition.calculated?.distance ?? -1), UnitType.NMILE);
                }
                return window.legCumulativeDist.toFixed((window.legCumulativeDist < 100) ? 1 : 0);
            }
        },
        this.props.data,
        this.currentLNavWpt
    );


    private _fuelRemLBS = MappedSubject.create(
        ([gsKTS, fuelFlowGPH, totalFuelGAL, dist]): string => {
            let distToFixNM = (dist !== '____') ? Number(dist) : -1;
            if (distToFixNM === -1 || this.props.data.get().legIsBehind) {
                return '_____';
            } else if (distToFixNM >= 0 && gsKTS > 30 && fuelFlowGPH > 0) {
                const fuelRemaining = totalFuelGAL - (distToFixNM / gsKTS) * fuelFlowGPH;
                return Math.round(UnitType.GALLON_FUEL.convertTo(fuelRemaining, UnitType.POUND)).toFixed(0);
            } else {
                return '_____';
            }
        },
        this.gsKTS,
        this.fuelFlowGPH,
        this.totalFuelGAL,
        this._cumulativeDistance
    );

    private _enduranceHRS = this._fuelRemLBS.map((fuelVal): string => {
            if (fuelVal != '_____') {
                let fuelRem: number = +fuelVal;
                let end = fuelRem / UnitType.GPH_FUEL.convertTo(this.fuelFlowGPH.get(), UnitType.PPH)
                let endMINS = ((end % 1) * 60).toFixed(0).padStart(2, '0');
                let endHRS = end.toString().split('.')[0];
                if (end < 0) {
                    return '0' + '+' + '00'
                }
                return endHRS + '+' + endMINS;
            } else {
                return '_____';
            }
        }
    );

    private _ete = MappedSubject.create(
        ([gsKTS, dist]): string => {
            let distToFixNM = (dist !== '____') ? Number(dist) : -1;
            if (distToFixNM === -1 || this.props.data.get().legIsBehind) {
                return '_____';
            } else if (distToFixNM >= 0 && gsKTS > 30) {
                let eteHRSDecimal = distToFixNM / gsKTS;
                eteHRSDecimal = Number(eteHRSDecimal.toPrecision(4))
                let hrs = Math.floor(eteHRSDecimal)
                let mins = (eteHRSDecimal % 1) * 60;
                let secs = (mins % 1) * 60;
                if (eteHRSDecimal < 1) {
                    return (Math.floor(mins).toString().padStart(2, '0') + ":" + Math.round(secs).toString().padStart(2, '0'));
                } else {
                    return (Math.floor(hrs).toString().padStart(2, '0') + "+" + Math.round(mins).toString().padStart(2, '0'));
                }
            } else {
                return '_____';
            }
        },
        this.gsKTS,
        this._cumulativeDistance
    );

    private _eta = MappedSubject.create(
        ([gsKTS, simTime, dist]) => {
            let distToFixNM = (dist !== '____') ? Number(dist) : -1;
            if (distToFixNM === -1 || this.props.data.get().legIsBehind) {
                return '_____';
            } else if (distToFixNM >= 0 && gsKTS > 30) {
                let eta = UnitType.HOUR.convertTo(distToFixNM / gsKTS, UnitType.MILLISECOND) + simTime;
                const date = new Date(eta);
                return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0')
            } else {
                return '_____';
            }
        },
        this.gsKTS,
        this.simTime,
        this._cumulativeDistance
    );

    private _brg = ComputedSubject.create(this.activeLegBearing.get() ?? -1, (v): string => {
            if (v < 0) {
                return '___';
            } else {
                const rounded = Math.round(v);
                return (rounded === 0 ? 360 : rounded).toFixed(0).padStart(3, '0');
            }
        }
    );

    private _dtk = ComputedSubject.create(this.props.data.get().legDefinition.calculated?.initialDtk ?? -1, (v): string => {
        if (v < 0 || this.props.data.get().legIsBehind) {
            return '___';
        } else {
            const rounded = Math.round(v);
            return (rounded === 0 ? 360 : rounded).toFixed(0).padStart(3, '0');
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
                this._brg.set(this.activeLegBearing.get());
            } else if (v.isAirwayExitFix && v.isCollapsed) {
                this._dtk.set(-1);
                this._brg.set(-1);
            } else if (v.legDefinition.leg.type === LegType.HF || v.legDefinition.leg.type === LegType.HM || v.legDefinition.leg.type === LegType.HA) {
                this._dtk.set(v.legDefinition.leg.course);
                this._brg.set(v.legDefinition.leg.course);
            } else {
                this._dtk.set(v.legDefinition.calculated?.initialDtk ?? -1);
                this._brg.set(v.legDefinition.calculated?.initialDtk ?? -1);
            }
            const altitude = Math.round(UnitType.METER.convertTo(v.invalidConstraintAltitude ?? v.targetAltitude ?? -1, UnitType.FOOT));

            // this.setCumDistance(v);

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
                    {this._cumulativeDistance}
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
                        LB/
                    </span>
                    {this._enduranceHRS}
                </div>
                <div class='mfd-ete-value'>
                    {this._ete}
                </div>
                <div class='mfd-eta-value'>
                    {this._eta}
                    <span class="smallText">
                        LCL
                    </span>
                </div>
                <div class='mfd-eta-value'>
                    {this._eta}
                    <span class="smallText">
                        LCL
                    </span>
                </div>
                <div class='mfd-brg-value'>
                    {this._brg}°
                </div>
            </div>
        );
    }
}
