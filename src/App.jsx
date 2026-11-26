import HostView from './views/HostView.jsx';
import GuestView from './views/GuestView.jsx';

export default function App() {
  const hostId = new URLSearchParams(window.location.search).get('hostId');
  return hostId ? <GuestView hostId={hostId} /> : <HostView />;
}
