import {
    ControlPublisher,
    DisplayComponent,
    DisplayComponentFactory,
    FSComponent,
    registerPlugin,
    TrafficInstrument
} from '@microsoft/msfs-sdk';
import {
    G1000AvionicsPlugin,
    G1000MfdPluginBinder
} from '@microsoft/msfs-wtg1000';
import {ViewMenu} from './Components/UI/Menus/ViewMenu';
import {MFDFPLWidePage} from './Components/UI/FPL/MFDFPLWidePage';
import {MFDNavMapWidePage} from './Components/UI/FPL/MFDNavMapWidePage';
import {
    GarminAdsb,
    TrafficAdvisorySystem
} from "@microsoft/msfs-garminsdk";

export class WTG1000WideViewPlugin extends G1000AvionicsPlugin<G1000MfdPluginBinder> {
    private readonly controlPublisher: ControlPublisher = new ControlPublisher(this.binder.bus);
    private readonly trafficInstrument: TrafficInstrument = new TrafficInstrument(this.binder.bus, {
        realTimeUpdateFreq: 2,
        simTimeUpdateFreq: 1,
        contactDeprecateTime: 10
    });
    private readonly tas = new TrafficAdvisorySystem(this.binder.bus, this.trafficInstrument, new GarminAdsb(this.binder.bus), false);

    public onInstalled(): void {
        this.loadCss('coui://html_ui/Mods/WTG1000WideViewPlugin.css').then(() => {
            console.log("CSS loaded");
        });
        this.tas.init();
    }

    public onMenuSystemInitialized(): void {
        this.binder.menuSystem.addMenu('view-opt', new ViewMenu(this.binder.menuSystem, this.controlPublisher, this.binder.viewService));
        this.binder.menuSystem.getMenu('fpln-menu').getItem(4).disabled.set(false);
        this.binder.menuSystem.getMenu('fpln-menu').removeItem(0);
        this.binder.menuSystem.getMenu('navmap-root').removeItem(0);
    }

    public onViewServiceInitialized(): void {
        this.binder.viewService.registerView('FPLWidePage', () =>
            <MFDFPLWidePage viewService={this.binder.viewService}
                            fms={this.binder.fms}
                            bus={this.binder.bus}
                            tas={this.tas}
                            menuSystem={this.binder.menuSystem}/>
        );
    }

    public onComponentCreating = (constructor: DisplayComponentFactory<any>, props: any): DisplayComponent<any> | undefined => {
        if (constructor.name === 'MFDNavMapPage') {
            return new MFDNavMapWidePage({
                bus: this.binder.bus,
                viewService: this.binder.viewService,
                menuSystem: this.binder.menuSystem,
                tas: this.tas,
                flightPlanner: this.binder.fms.flightPlanner
            });
        }
        return undefined;
    };
}

registerPlugin(WTG1000WideViewPlugin);