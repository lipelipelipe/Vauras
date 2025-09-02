// src/lib/webstory-types.ts

// Tipos para as opções de customização do Web Story (client-safe)
export type StoryOptions = {
    duration: number;
    colors: {
      heading: string;
      paragraph: string;
      subheading: string;
      secondary: string;
      buttonStart: string;
      buttonEnd: string;
      scrimTop: string;
      scrimBottom: string;
    };
    shadows: {
      heading: number;
      paragraph: number;
      subheading: number;
    };
    fontSizes: {
      heading: number;
      subheading: number;
      paragraph: number;
    };
    headingGradient: boolean;
    subheadingGradient: boolean;
    paragraphGradient: boolean;
    animations: {
      preset: string;
      textMode: 'cycle_all' | 'single' | 'cycle_custom';
      textEffect: string;
      textEffects: string[];
      textDuration: number;
      bgDuration?: number;
    };
    parallax: {
      effect: string;
      alternateDirection: boolean;
      startDirection: 'left' | 'right';
      duration: number;
    };
    fonts: {
      heading: string;
      paragraph: string;
      subheading: string;
    };
    cta: {
      showSharePrompt: boolean;
      showBottomLine: boolean;
      shareMessage: string;
      bottomMessage: string;
      buttonLabel: string;
    };
    cover: {
      badgeText: string;
    };
  };