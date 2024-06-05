import {registerPlugin, ControlPublisher, FSComponent} from '@microsoft/msfs-sdk';
import {G1000AvionicsPlugin, G1000MfdPluginBinder} from '@microsoft/msfs-wtg1000';
import {ViewMenu} from './ViewMenu';
import {MFDFPLWidePage} from './MFDFPLWidePage';

export class WTG1000WideViewPlugin extends G1000AvionicsPlugin<G1000MfdPluginBinder> {
    private controlPublisher: ControlPublisher = new ControlPublisher(this.binder.bus);

    public onInstalled(): void {
        this.loadCss('coui://html_ui/Mods/WTG1000WideViewPlugin.css').then(() => {
            console.log("CSS loaded");
        });
    }

    public onMenuSystemInitialized(): void {
        this.binder.menuSystem.addMenu('view-opt', new ViewMenu(this.binder.menuSystem, this.controlPublisher, this.binder.viewService));
        this.binder.menuSystem.getMenu('fpln-menu').getItem(4).disabled.set(false);
    }

    public onViewServiceInitialized(): void {
        this.binder.viewService.registerView('FPLPage', () => {
            return <MFDFPLWidePage viewService={this.binder.viewService} fms={this.binder.fms} bus={this.binder.bus}
                                   menuSystem={this.binder.menuSystem}/>
        });
    }
}

registerPlugin(WTG1000WideViewPlugin);