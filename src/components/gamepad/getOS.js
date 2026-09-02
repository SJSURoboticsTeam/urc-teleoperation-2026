export function getOS() {
    if(navigator.userAgentData?.platform) {
        const platform = navigator.userAgentData?.platform.toLowerCase();
        if(platform.includes("win")) return "windows";
        if(platform.includes("mac")) return "mac";
        if(platform.includes("linux")) return "linux";
    }

    const userAgent = navigator.userAgent.toLowerCase();
    if(userAgent.includes("win")) return "windows";
    if(userAgent.includes("mac")) return "mac";
    if(userAgent.includes("linux")) return "linux";

    return "unknown";
}