// GradeX buzzes the phone on nav taps through @capacitor/haptics. This app's
// Android shell is a plain webview without that plugin, so every call here does
// nothing; Navigation.jsx hides the Haptics switch to match.
export const HAPTICS_CHANGE_EVENT = 'gradexHapticsPrefChanged';
export const areNativeHapticsEnabled = () => false;
export const setNativeHapticsEnabled = () => {};
export const triggerNativeHaptic = async () => {};
