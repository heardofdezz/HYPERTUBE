import axios from 'axios';

export default () => {
    const token = localStorage.getItem('hypertube-token');
    return axios.create({
        baseURL: 'http://localhost:8081',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
};
