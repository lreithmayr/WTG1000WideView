import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-import-css';

export default {
  input: 'src/WTG1000WideViewPlugin.tsx',
  output: {
    file: 'dist/G1000WideViewMSFSProject/g1000-wide-view/PackageSources/Copys/g1000-wide-view-plugin/Mods/WTG1000WideViewPlugin.js',
    format: 'iife',
    name: 'wtg100WideView',
    globals: {
      '@microsoft/msfs-sdk': 'msfssdk',
      '@microsoft/msfs-wtg1000': 'g1000nximfd',
      '@microsoft/msfs-garminsdk': 'garminsdk'
    }
  },
  external: ['@microsoft/msfs-sdk', '@microsoft/msfs-garminsdk', '@microsoft/msfs-wtg1000'],
  plugins: [css({ output: 'WTG1000WideViewPlugin.css' }), resolve(), typescript()]
}