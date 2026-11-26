import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// StrictMode는 개발 모드에서 effect를 두 번 실행해 Peer가 중복 생성되므로 사용하지 않습니다.
createRoot(document.getElementById('root')).render(<App />);
