import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!user) { setSocket(null); return; }

        const token = localStorage.getItem('accessToken');
        const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://cabgo-backend-production.up.railway.app';
        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => console.log('🔌 Socket connected'));
        newSocket.on('disconnect', () => console.log('🔌 Socket disconnected'));

        setSocket(newSocket);
        return () => newSocket.close();
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
