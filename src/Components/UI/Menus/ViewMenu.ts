import {ControlPublisher} from '@microsoft/msfs-sdk';
import {SoftKeyMenuSystem, SoftKeyMenu, ViewService} from '@microsoft/msfs-wtg1000';

/**
 * The MFD flight plan view options menu.
 */
export class ViewMenu extends SoftKeyMenu {
    private publisher: ControlPublisher;
    private viewService: ViewService;

    constructor(menuSystem: SoftKeyMenuSystem, publisher: ControlPublisher, viewService: ViewService) {
        super(menuSystem);
        this.menuSystem = menuSystem;
        this.publisher = publisher;
        this.viewService = viewService;

        this.addItem(4, 'Wide', () => {
            this.activateWideView();
        }, false, false);
        this.addItem(5, 'Narrow', () => {
            this.activateNarrowView();
        }, true, false);
        this.addItem(7, 'Leg-Leg', () => {
            this.activateLegLegMode();
        }, false, false);
        this.addItem(8, 'CUM', () => {
            this.activateCumMode();
        }, true, false);
        this.addItem(10, 'Back', () => menuSystem.back());
    }
    private activateWideView() {
        if (this.viewService.activeViewKey.get() == 'FPLWidePage') {
            this.getItem(4).value.set(true);
            return;
        }
        this.viewService.open('FPLWidePage');
        this.menuSystem.pushMenu('view-opt');
        this.getItem(4).value.set(true);
        this.getItem(5).value.set(false);
        window.fplWideViewActive = true;
    }

    private activateLegLegMode(): void {
        this.getItem(7).value.set(true);
        this.getItem(8).value.set(false);
        window.legLegModeSubject.set(true);
    }

    private activateCumMode(): void {
        this.getItem(7).value.set(false);
        this.getItem(8).value.set(true);
        window.legLegModeSubject.set(false);
    }

    private activateNarrowView() {
        if (this.viewService.activeViewKey.get() == 'FPLPage') {
            this.getItem(5).value.set(true);
            return;
        }
        this.viewService.open('FPLPage');
        this.menuSystem.pushMenu('view-opt');
        this.getItem(4).value.set(false);
        this.getItem(5).value.set(true);
        window.fplWideViewActive = false;
    }
}