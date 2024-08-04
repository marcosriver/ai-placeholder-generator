
import React from 'react';
import { createRoot } from 'react-dom/client';
import Placeholder from './placeholder.jsx';

const App = () => {
    return (
        <>
            <Placeholder />
        </>
    );
};

createRoot(document.querySelector('#root')).render(<App />);