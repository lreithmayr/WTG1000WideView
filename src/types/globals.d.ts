/* eslint-disable no-var */
// noinspection ES6ConvertVarToLetConst

declare global {
    var legCumulativeDist: number = 0.0;
    var fplWideViewActive: boolean = false;
    /** When true, DIS/ETE show per-leg values. When false (default), cumulative. */
    var legLegModeSubject: import('@microsoft/msfs-sdk').Subject<boolean>;
}
export {};