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
        }, false, true);
        this.addItem(8, 'CUM', () => {
        }, false, true);
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