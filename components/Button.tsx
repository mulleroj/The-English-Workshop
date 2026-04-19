import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  // Industrial styling: Rounded-md (squarer), Monospace font, Uppercase, Tracking
  const baseStyles = "py-3 px-6 rounded-md font-mono font-bold uppercase tracking-wider transition-all duration-200 shadow-lg active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed border-2";
  
  const variants = {
    // Safety Yellow / Construction Theme
    primary: "bg-yellow-500 border-yellow-500 text-black hover:bg-yellow-400 hover:border-yellow-400 hover:shadow-yellow-500/20",
    // Dark metallic look with yellow text
    secondary: "bg-zinc-800 border-zinc-700 text-yellow-500 hover:bg-zinc-700 hover:border-yellow-500/50",
    // Industrial Alert Red
    danger: "bg-red-700 border-red-700 text-white hover:bg-red-600 hover:border-red-600",
    // Industrial Safety Green
    success: "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-500 hover:border-emerald-500",
    // Outline wireframe look
    outline: "bg-transparent border-zinc-600 text-zinc-400 hover:border-yellow-500 hover:text-yellow-500"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;