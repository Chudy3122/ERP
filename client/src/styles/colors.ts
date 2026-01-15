// Modern, clean color palette (LinkedIn/Facebook style)
export const colors = {
  // Primary - Professional Blue
  primary: {
    main: '#0A66C2',      // LinkedIn blue
    light: '#378FE9',
    lighter: '#EFF6FC',
    dark: '#004182',
  },

  // Neutral - Clean grays
  neutral: {
    white: '#FFFFFF',
    bg: '#F3F4F6',         // Light gray background
    border: '#E5E7EB',     // Subtle borders
    text: {
      primary: '#1F2937',  // Dark gray for main text
      secondary: '#6B7280', // Medium gray for secondary text
      tertiary: '#9CA3AF',  // Light gray for hints
    }
  },

  // Status colors
  success: '#10B981',      // Green
  error: '#EF4444',        // Red
  warning: '#F59E0B',      // Amber
  info: '#3B82F6',         // Blue

  // Online status
  online: '#10B981',
  offline: '#9CA3AF',
  away: '#F59E0B',
  busy: '#EF4444',
};

// Component-specific colors
export const componentColors = {
  sidebar: {
    bg: '#FFFFFF',
    hover: '#F3F4F6',
    active: '#EFF6FC',
    border: '#E5E7EB',
  },

  chat: {
    messageBg: '#F3F4F6',
    myMessageBg: '#0A66C2',
    myMessageText: '#FFFFFF',
  },

  button: {
    primary: {
      bg: '#0A66C2',
      hover: '#004182',
      text: '#FFFFFF',
    },
    secondary: {
      bg: '#F3F4F6',
      hover: '#E5E7EB',
      text: '#1F2937',
    },
  },
};
