import React, { createContext, useContext, useState } from "react";

interface BannerState {
    message: string;
    type: "success" | "error" | "info" | null;
}

const BannerContext = createContext({
    banner: { message: "", type: "info" } as BannerState,
    showBanner: (message: string, type: BannerState["type"]) => { },
});

export const BannerProvider = ({ children }: any) => {
    const [banner, setBanner] = useState<BannerState>({
        message: "",
        type: "info",
    });

    const showBanner = (message: string, type: BannerState["type"]) => {
        setBanner({ message, type });
        setTimeout(() => setBanner({ message: "", type: "info" }), 3000);
    };
    return (
        <BannerContext.Provider value={{ banner, showBanner }}>
            {children}
        </BannerContext.Provider>
    );
};

export const useBanner = () => useContext(BannerContext);
