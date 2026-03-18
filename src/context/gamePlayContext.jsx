import { createContext, useState } from "react";

export const GamePlayContext = createContext();

export const GamePlayProvider = ({ children }) => {
    const [isGamePlay, setIsGamePlay] = useState(false);

    return (
        <GamePlayContext.Provider value={{ isGamePlay, setIsGamePlay }}>
            {children}
        </GamePlayContext.Provider>
    );
}