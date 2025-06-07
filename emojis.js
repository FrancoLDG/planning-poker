// emojis.js
export function setupEmojiAttacks() {
  const mesa = document.getElementById('mesa-container');

  mesa.addEventListener('mouseover', (e) => {
    const persona = e.target.closest('.persona');
    if (!persona || persona.querySelector('.emoji-buttons')) return;

    const btnContainer = document.createElement('div');
    btnContainer.className = 'emoji-buttons';
    btnContainer.style.position = 'absolute';
    btnContainer.style.top = '60px';
    btnContainer.style.left = '50%';
    btnContainer.style.transform = 'translateX(-50%)';
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '0.5px';
    btnContainer.style.zIndex = '10';
    btnContainer.style.opacity = '0';
    btnContainer.style.transition = 'opacity 0.3s ease';
    requestAnimationFrame(() => btnContainer.style.opacity = '1');
    btnContainer.style.background = 'rgba(0, 0, 0, 0.2)';
    btnContainer.style.borderRadius = '12px';
    btnContainer.style.backdropFilter = 'blur(6px)';
    btnContainer.style.padding = '2px 3px';

    ['👍', '🪨', '⛔'].forEach((emoji) => {
      const btn = document.createElement('button');
      btn.textContent = emoji;
      btn.style.border = 'none';
      btn.style.background = 'transparent';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '.8rem';
      btn.style.padding = '0.1rem';
      btn.onclick = () => launchEmoji(emoji, persona);
      btnContainer.appendChild(btn);
    });

    persona.appendChild(btnContainer);

    persona.addEventListener('mouseleave', () => {
      btnContainer.remove();
    }, { once: true });
  });
}

function launchEmoji(emoji, target) {
  const fly = document.createElement('div');
  fly.textContent = emoji;
  fly.style.position = 'fixed';
  fly.style.fontSize = '1.8rem';
  fly.style.transition = 'transform 1s linear, top 1s linear, left 1s linear';
  fly.style.zIndex = '9999';

  // Sale desde un costado aleatorio
  const fromLeft = Math.random() > 0.5;
  fly.style.top = `${Math.random() * window.innerHeight}px`;
  fly.style.left = fromLeft ? '-40px' : `${window.innerWidth + 40}px`;
  document.body.appendChild(fly);

  // Coordenadas de destino (ícono del participante)
  const rect = target.getBoundingClientRect();
  const targetX = rect.left + rect.width / 2;
  const targetY = rect.top + rect.height / 2;

  setTimeout(() => {
    fly.style.left = `${targetX}px`;
    fly.style.top = `${targetY}px`;
    fly.style.transform = 'scale(1.2) rotate(720deg)';
  }, 10);

  // Rebote y caída
  setTimeout(() => {
    fly.style.transition = 'all 0.6s ease-out';
    const offset = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 20); // rebote lateral
    fly.style.transform = `translate(${offset}px, 30px) rotate(${offset * 2}deg) scale(0.8)`;
    }, 1000);

  setTimeout(() => fly.remove(), 1800);
}
