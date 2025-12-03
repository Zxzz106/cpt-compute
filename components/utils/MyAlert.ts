export default function MyAlert(message: string, duration = 300) {
  if (typeof document === 'undefined') return;

  const container = document.createElement('div');
  container.className = 'cpt-myalert';
  container.id = `cpt-myalert-${Date.now()}`;
  container.textContent = message;
  Object.assign(container.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    background: 'rgba(17,17,17,0.95)',
    color: '#fff',
    padding: '0.6rem 1rem',
    borderRadius: '0.375rem',
    boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
    opacity: '0',
    transform: 'translate(-50%, -60%)',
    transition: 'opacity 1s ease, transform 1s ease',
    zIndex: '9999',
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    fontSize: '14px',
    maxWidth: '90%',
    textAlign: 'center',
  });

  document.body.appendChild(container);

  // Trigger browser paint then fade in $duration ms
  requestAnimationFrame(() => {
    container.style.opacity = '1';
    container.style.transform = 'translate(-50%, -50%)';
  });

  const remove = () => {
    container.style.opacity = '0';
    container.style.transform = 'translate(-50%, -60%)';
    setTimeout(() => {
      try { container.remove(); } catch (e) { /* ignore */ }
    }, 3000);
  };

  setTimeout(remove, duration);
}
