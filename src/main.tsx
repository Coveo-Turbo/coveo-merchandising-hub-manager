import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {createBrowserApiTransport} from './core/apiTransport';
import {createStoredContextResolver, createBrowserSessionStore} from './core/sessionStorage';
import './index.css';

const sessionStore = createBrowserSessionStore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      runtime="standalone"
      transport={createBrowserApiTransport()}
      contextResolver={createStoredContextResolver(sessionStore)}
      sessionStore={sessionStore}
    />
  </StrictMode>,
);
