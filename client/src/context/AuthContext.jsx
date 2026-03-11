import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            api.get('/auth/me')
                .then(({ data }) => setUser(data.data.user))
                .catch(() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (phone, password) => {
        const { data } = await api.post('/auth/login', { phone, password });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        return data.data.user;
    };

    const register = async (formData) => {
        const { data } = await api.post('/auth/register', formData);
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        return data.data.user;
    };

    const guestLogin = async () => {
        const { data } = await api.post('/auth/guest');
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        return data.data.user;
    };

    const logout = () => {
        api.post('/auth/logout').catch(() => { });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, register, guestLogin, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
