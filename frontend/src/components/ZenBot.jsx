import React from 'react';

export default function ZenBot({ state = 'idle', className = '', isLight = false, size = 'sm', showFace = true }) {
    const isThinking = state === 'thinking';
    const isListening = state === 'listening';
    const isDozing = state === 'dozing';

    const dims = size === 'xl' ? 'w-64 h-64' : size === 'lg' ? 'w-48 h-48' : 'w-16 h-16';



    
    const colorPrimary = isLight ? 'rgba(0, 137, 123, 0.85)' : 'rgba(0, 229, 204, 0.85)';
    const colorSecondary = isLight ? 'rgba(0, 150, 136, 0.6)' : 'rgba(20, 184, 166, 0.6)';
    const colorAccent = isLight ? 'rgba(0, 191, 165, 0.5)' : 'rgba(64, 238, 220, 0.5)';

   
    const scale = isThinking ? 'scale(0.92)' : isDozing ? 'scale(0.98)' : isListening ? 'scale(1.05)' : 'scale(1)';
    const opacity = isDozing ? 0.3 : 1;
    const animationSpeed = isThinking ? '1.5s' : isListening ? '2.5s' : isDozing ? '8s' : '4s';

    return (
        <div className={`relative flex items-center justify-center ${className} transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)]`} style={{ transform: scale, opacity }}>

           
            <div
                className="absolute inset-0 rounded-full blur-[30px] mix-blend-screen transition-all duration-1000 pointer-events-none"
                style={{
                    background: `radial-gradient(circle, ${colorPrimary} 0%, transparent 70%)`,
                    opacity: isThinking ? 0.5 : isDozing ? 0.1 : 0.3,
                    transform: isListening ? 'scale(1.4)' : isThinking ? 'scale(1.1)' : 'scale(1.2)',
                    animation: `pulse ${animationSpeed} infinite alternate ease-in-out`
                }}
            />

            <div
                className={`relative ${dims} rounded-full overflow-hidden transition-all duration-1000 pointer-events-none shadow-2xl`}
                style={{
                    background: isLight ? 'rgba(255, 255, 255, 0.2)' : 'rgba(6, 10, 10, 0.45)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: `1px solid rgba(255,255,255, ${isLight ? '0.4' : '0.15'})`,
                    boxShadow: `
                        inset 0 0 30px rgba(255,255,255, ${isLight ? '0.6' : '0.1'}),
                        inset 0 -20px 40px ${colorPrimary},
                        0 20px 40px -10px rgba(0,0,0, ${isLight ? '0.1' : '0.5'})
                    `,
                }}
            >
               
                <div
                    className="absolute inset-[-40%] rounded-full opacity-60 mix-blend-color-dodge transition-all duration-1000"
                    style={{
                        background: `conic-gradient(from 0deg, ${colorAccent}, ${colorSecondary}, ${colorPrimary}, ${colorAccent})`,
                        animation: `spin ${animationSpeed} linear infinite ${isListening ? '' : 'reverse'}`,
                        filter: isThinking ? 'contrast(1.4) brightness(1.2) blur(10px)' : 'blur(15px)'
                    }}
                />

               
                <div
                    className="absolute inset-[15%] rounded-full transition-all duration-1000 mix-blend-overlay"
                    style={{
                        background: `radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, ${colorPrimary} 40%, transparent 70%)`,
                        animation: `pulse ${parseFloat(animationSpeed) * 0.8}s infinite alternate ease-in-out`,
                        opacity: isDozing ? 0.2 : 0.9,
                        transform: isListening ? 'scale(1.1)' : 'scale(0.9)',
                    }}
                />

              
                <div
                    className="absolute top-[2%] left-[10%] w-[80%] h-[40%] rounded-full rotate-[-15deg] pointer-events-none opacity-80"
                    style={{
                        background: `linear-gradient(180deg, rgba(255,255,255,${isLight ? '0.9' : '0.5'}) 0%, transparent 100%)`,
                        filter: 'blur(1px)'
                    }}
                />

                
                {showFace && (
                    <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 100 100"
                    >
                      
                        <path
                            d={isListening
                                ? "M 27,53 Q 35,42 43,53"   
                                : isThinking
                                    ? "M 29,55 Q 35,50 41,55" 
                                    : isDozing
                                        ? "M 27,56 L 43,56"    
                                        : "M 27,54 Q 35,48 43,54" 
                            }
                            fill="none"
                            stroke="var(--primary-container)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            style={{
                                filter: isLight
                                    ? 'drop-shadow(0 0 4px rgba(0, 191, 165, 0.6)) drop-shadow(0 0 8px rgba(0, 191, 165, 0.3))'
                                    : 'drop-shadow(0 0 6px var(--primary-container)) drop-shadow(0 0 12px var(--glow-primary))',
                                transition: 'all 0.8s cubic-bezier(0.2,0.8,0.2,1)',
                            }}
                        />

                       
                        <path
                            d={isListening
                                ? "M 57,53 Q 65,42 73,53"
                                : isThinking
                                    ? "M 59,55 Q 65,50 71,55"
                                    : isDozing
                                        ? "M 57,56 L 73,56"
                                        : "M 57,54 Q 65,48 73,54"
                            }
                            fill="none"
                            stroke="var(--primary-container)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            style={{
                                filter: isLight
                                    ? 'drop-shadow(0 0 4px rgba(0, 191, 165, 0.6)) drop-shadow(0 0 8px rgba(0, 191, 165, 0.3))'
                                    : 'drop-shadow(0 0 6px var(--primary-container)) drop-shadow(0 0 12px var(--glow-primary))',
                                transition: 'all 0.8s cubic-bezier(0.2,0.8,0.2,1)',
                            }}
                        />

                        
                        {isListening && (
                            <>
                                <path d="M 27,53 Q 35,42 43,53 Z" fill="var(--primary-container)" opacity="0.15"
                                    style={{ filter: 'blur(2px)' }} />
                                <path d="M 57,53 Q 65,42 73,53 Z" fill="var(--primary-container)" opacity="0.15"
                                    style={{ filter: 'blur(2px)' }} />
                                {/* Tiny sparkle when listening */}
                                <circle cx="35" cy="50" r="1.5" fill="white" opacity="0.8" />
                                <circle cx="65" cy="50" r="1.5" fill="white" opacity="0.8" />
                            </>
                        )}
                    </svg>
                )}
            </div>
        </div>
    );
}
