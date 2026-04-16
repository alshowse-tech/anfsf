/**
 * UI/UX Module Constants
 *
 * Common constants for UI intelligent synthesis.
 * Version: 1.4.0
 */
export declare const BREAKPOINTS: {
    readonly mobile: {
        readonly minWidth: 0;
        readonly maxWidth: 639;
        readonly columns: 4;
        readonly gutter: 16;
    };
    readonly tablet: {
        readonly minWidth: 640;
        readonly maxWidth: 1023;
        readonly columns: 8;
        readonly gutter: 24;
    };
    readonly desktop: {
        readonly minWidth: 1024;
        readonly maxWidth: number;
        readonly columns: 12;
        readonly gutter: 32;
    };
};
export declare const SPACING_SCALE: {
    readonly 0: "0";
    readonly 1: "0.25rem";
    readonly 2: "0.5rem";
    readonly 3: "0.75rem";
    readonly 4: "1rem";
    readonly 5: "1.25rem";
    readonly 6: "1.5rem";
    readonly 8: "2rem";
    readonly 10: "2.5rem";
    readonly 12: "3rem";
    readonly 16: "4rem";
    readonly 20: "5rem";
    readonly 24: "6rem";
    readonly 32: "8rem";
};
export declare const FONT_SIZE_SCALE: {
    readonly xs: "0.75rem";
    readonly sm: "0.875rem";
    readonly base: "1rem";
    readonly lg: "1.125rem";
    readonly xl: "1.25rem";
    readonly '2xl': "1.5rem";
    readonly '3xl': "1.875rem";
};
export declare const FONT_WEIGHT_SCALE: {
    readonly normal: 400;
    readonly medium: 500;
    readonly semibold: 600;
    readonly bold: 700;
};
export declare const LINE_HEIGHT_SCALE: {
    readonly tight: 1.25;
    readonly normal: 1.5;
    readonly relaxed: 1.75;
};
export declare const BORDER_RADIUS_SCALE: {
    readonly none: "0";
    readonly sm: "0.125rem";
    readonly md: "0.375rem";
    readonly lg: "0.5rem";
    readonly xl: "0.75rem";
    readonly '2xl': "1rem";
    readonly full: "9999px";
};
export declare const SHADOW_DEFINITIONS: {
    readonly sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
    readonly md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
    readonly lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
    readonly xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
    readonly '2xl': "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
};
export declare const DEFAULT_PRIMARY_COLOR: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
};
export declare const DEFAULT_SECONDARY_COLOR: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
};
export declare const DEFAULT_NEUTRAL_COLOR: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
};
export declare const DEFAULT_SEMANTIC_COLORS: {
    success: string;
    warning: string;
    error: string;
    info: string;
};
export declare const ANIMATION_DEFAULTS: {
    readonly duration: {
        readonly fast: 150;
        readonly normal: 300;
        readonly slow: 500;
    };
    readonly easing: {
        readonly linear: "linear";
        readonly ease: "ease";
        readonly easeIn: "ease-in";
        readonly easeOut: "ease-out";
        readonly easeInOut: "ease-in-out";
    };
};
export declare const A11Y_STANDARDS: {
    readonly wcag: {
        readonly level: "AA";
        readonly version: "2.1";
    };
    readonly minContrastRatio: {
        readonly normal: 4.5;
        readonly large: 3;
    };
    readonly minTouchTarget: 44;
};
export declare const FRAMEWORK_TEMPLATES: {
    readonly react: {
        readonly extension: ".tsx";
        readonly import: "import";
        readonly export: "export";
    };
    readonly vue: {
        readonly extension: ".vue";
        readonly import: "import";
        readonly export: "export default";
    };
    readonly angular: {
        readonly extension: ".component.ts";
        readonly import: "import";
        readonly export: "export";
    };
};
export declare const UI_LIBRARY_COMPONENTS: {
    readonly antd: {
        readonly button: "Button";
        readonly input: "Input";
        readonly form: "Form";
        readonly modal: "Modal";
        readonly table: "Table";
        readonly card: "Card";
        readonly layout: "Layout";
        readonly menu: "Menu";
    };
    readonly mui: {
        readonly button: "Button";
        readonly input: "TextField";
        readonly form: "Form";
        readonly modal: "Modal";
        readonly table: "Table";
        readonly card: "Card";
        readonly layout: "Box";
        readonly menu: "Menu";
    };
    readonly chakra: {
        readonly button: "Button";
        readonly input: "Input";
        readonly form: "FormControl";
        readonly modal: "Modal";
        readonly table: "Table";
        readonly card: "Card";
        readonly layout: "Box";
        readonly menu: "Menu";
    };
    readonly raw: {
        readonly button: "button";
        readonly input: "input";
        readonly form: "form";
        readonly modal: "dialog";
        readonly table: "table";
        readonly card: "div";
        readonly layout: "div";
        readonly menu: "nav";
    };
};
export declare const LAYOUT_PATTERNS: {
    readonly dashboard: {
        readonly type: "grid";
        readonly sections: readonly ["header", "sidebar", "main", "footer"];
    };
    readonly landing: {
        readonly type: "flex";
        readonly sections: readonly ["header", "hero", "features", "footer"];
    };
    readonly form: {
        readonly type: "flex";
        readonly sections: readonly ["header", "content", "footer"];
    };
    readonly list: {
        readonly type: "grid";
        readonly sections: readonly ["header", "filter", "list", "pagination", "footer"];
    };
    readonly detail: {
        readonly type: "flex";
        readonly sections: readonly ["header", "breadcrumb", "content", "sidebar", "footer"];
    };
};
