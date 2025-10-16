import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get, remove, onDisconnect, push } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// === Configuración y Inicialización de Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyDDnsYIkxDfO3NVu1Wwf1LMPZ_xmHh4Zws",
  authDomain: "planning-poker-ffc14.firebaseapp.com",
  databaseURL: "https://planning-poker-ffc14-default-rtdb.firebaseio.com",
  projectId: "planning-poker-ffc14",
  storageBucket: "planning-poker-ffc14.appspot.com",
  messagingSenderId: "835406865593",
  appId: "1:835406865593:web:1b611dfbf8103ab992e768"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// === Variables Globales y Constantes ===
const fibonacci = [0, 1, 2, 3, 5, 8, 13, 21, 34, '?'];
let team = '', name = '', role = '', selectedCard = null, revealed = false, currentVotes = {};
let timerInterval = null, selectedAvatar = '🚀', currentActiveTask = null, allConnections = {}; 
const avatars = ['🚀', '💻', '💡', '🧙‍♂️', '😎']; 
let tutorialStep = 0; // Para el tutorial del PO
const PO_TUTORIAL_KEY = 'PO_TUTORIAL_COMPLETED'; // Clave de localStorage para el tutorial

// MODIFICADO: Constantes para la gestión de salas
const PARTICIPANT_TIMEOUT_MS = 35000; // 35 segundos para considerar un participante activo
const ROOM_TIMEOUT_MS = 180000; // 3 minutos (180,000 ms) para mantener la sala activa en el listado

// === Funciones de UI y Efectos ===

// Efecto de escritura para Javi
function typewriterEffect(elementId, text) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = '';
  let i = 0;
  const speed = 50; 

  function type() {
    if (i < text.length) {
      el.innerHTML += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}

// Animación de cartas cayendo
function createFallingCard() {
  const container = document.getElementById('falling-cards');
  if (!container) return;
  
  const card = document.createElement('div');
  card.className = 'falling-card';
  
  const symbols = ['♠', '♥', '♦', '♣', '★', '♤', '♡', '♢'];
  const numbers = ['0', '1', '2', '3', '5', '8', '13', '21', '?', 'OMG'];
  
  const content = Math.random() > 0.5 ? 
    symbols[Math.floor(Math.random() * symbols.length)] : 
    numbers[Math.floor(Math.random() * numbers.length)];
  
  card.setAttribute('data-symbol', content);
  card.textContent = content;
  
  card.style.left = Math.random() * 100 + '%';
  
  const animations = ['fall1', 'fall2', 'fall3', 'fall4', 'fall5'];
  const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
  const duration = 8 + Math.random() * 7;
  
  card.style.animation = `${randomAnimation} ${duration}s linear ${Math.random() * 5}s`;
  
  container.appendChild(card);
  
  setTimeout(() => {
    card.remove();
  }, (duration + 5) * 1000);
}

function startFallingCards() {
  createFallingCard();
  setTimeout(startFallingCards, 1500 + Math.random() * 1500);
}

// Mostrar errores
function showError(message) {
  const errorContainer = document.getElementById('error-container');
  if (!errorContainer) return;
  errorContainer.innerHTML = `<div class="error-message">⚠️ ${message}</div>`;
  setTimeout(() => {
    errorContainer.innerHTML = '';
  }, 5000);
}

// Mostrar cartas de votación
function showCards() {
  const container = document.getElementById('cards');
  if (!container) return;
  container.classList.remove('hidden');
  container.innerHTML = '<h3>👇 Elige tu carta</h3>';

  fibonacci.forEach(val => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerText = val;
    // Se usa la función global selectCard
    div.onclick = () => selectCard(val, div); 
    container.appendChild(div);
  });

  const cafeDiv = document.createElement('div');
  cafeDiv.className = 'card';
  cafeDiv.innerText = '☕';
  // Se usa la función global selectCard
  cafeDiv.onclick = () => selectCard('☕', cafeDiv); 
  container.appendChild(cafeDiv);
}

// Actualizar el estado visual de las cartas
function updateCardsState() {
  const cards = document.querySelectorAll('.card');
  if (revealed) {
    cards.forEach(card => card.classList.add('disabled'));
  } else {
    cards.forEach(card => card.classList.remove('disabled'));
  }
}

// Reproducir sonido y animación del Joker al finalizar el timer
function playTimerEndSound() {
  const audio = document.getElementById('time-audio');
  if (audio) {
      audio.currentTime = 0; 
      audio.play().catch(e => console.error("Error al reproducir sonido:", e));
  }
  animateJokerTime();
}

function animateJokerTime() {
  const jokerContainer = document.getElementById('joker-container');
  const jokerShowing = document.getElementById('joker-showing');
  const jokerThrowing = document.getElementById('joker-throwing');
  const timeMessage = document.getElementById('time-message');

  if (!jokerContainer || !jokerShowing || !jokerThrowing || !timeMessage) return;

  // 0. Reset y Mostrar el contenedor principal
  jokerShowing.style.opacity = '0';
  jokerThrowing.style.opacity = '0';
  jokerContainer.style.display = 'block';
  jokerShowing.style.transition = 'transform 0.5s ease-out, opacity 0.1s linear';
  jokerThrowing.style.transition = 'opacity 0.1s linear';
  
  timeMessage.style.display = 'none';
  timeMessage.classList.remove('flickering');

  // 1. Mostrar la imagen "showing.png" y animarla (0s -> 0.5s)
  jokerShowing.style.opacity = '1';
  jokerShowing.style.transform = 'translateX(100px)'; 
  
  // 2. Transición a "arrojando.png" y mostrar "TIME!" (en 0.5s)
  setTimeout(() => {
      jokerShowing.style.opacity = '0'; 
      
      jokerThrowing.style.opacity = '1'; 
      jokerThrowing.style.transform = 'translateX(100px)'; 
      
      timeMessage.style.display = 'block';
      timeMessage.classList.add('flickering');

  }, 500); 

  // 3. Desaparecer todo después de 1.5s de parpadeo (0.5s + 1.5s = 2.0s)
  setTimeout(() => {
      jokerThrowing.style.opacity = '0';
      jokerThrowing.style.transform = 'translateX(0)'; 
      jokerContainer.style.display = 'none';
      
      timeMessage.style.display = 'none';
      timeMessage.classList.remove('flickering');
      
      jokerShowing.style.transform = 'translateX(0)';
      jokerShowing.style.transition = 'none';

  }, 2000); 
}

// === Funciones de Lógica de la Aplicación y Firebase ===

// MODIFICADO: Mantenimiento de actividad y metadatos de sala
function actualizarConexion() {
  if (name && team) {
    const now = Date.now();
    
    // 1. Actualizar conexión del usuario
    set(ref(db, `${team}/connections/${name}`), { 
      lastSeen: now,
      role: role,
      avatar: selectedAvatar 
    });
    
    // 2. Actualizar meta de la sala (activeRooms/team)
    
    // Obtener la cuenta de miembros/POs activos y el PO actual
    get(ref(db, `${team}/connections`)).then(snapshot => {
        const connections = snapshot.val() || {};
        let memberCount = 0;
        let poName = '';
        
        Object.entries(connections).forEach(([userName, data]) => {
            if (now - data.lastSeen < PARTICIPANT_TIMEOUT_MS) {
                if (data.role === 'member' || data.role === 'po') {
                    memberCount++;
                }
                if (data.role === 'po') {
                    poName = userName;
                }
            }
        });

        // Solo actualizamos la sala si hay al menos 1 miembro/PO activo
        if (memberCount > 0) {
            update(ref(db, `activeRooms/${team}`), {
                lastActive: now,
                memberCount: memberCount,
                poName: poName || 'Buscando PO'
            });
            
            // Configurar onDisconnect para el PO
            if (role === 'po') {
                 // Si el PO se desconecta, se limpia su nombre de la meta de la sala inmediatamente
                 onDisconnect(ref(db, `activeRooms/${team}/poName`)).set('Desconectado');
            }
            
        } else {
             // Si no hay participantes, forzar la eliminación después del timeout (aunque la lista usa su propio timer)
             // Esto asegura que la metadata se limpia.
             // La limpieza se realiza al leer la lista (renderActiveRooms)
        }
    }).catch(e => console.error("Error al obtener conexiones para actualizar sala:", e));
  }
}

// Función de entrada: Seleccionar la carta (GLOBAL)
window.selectCard = function(value, element) {
  if (revealed) return;
  
  selectedCard = value;
  document.querySelectorAll('.card').forEach(card => card.classList.remove('selected'));
  element.classList.add('selected');
  set(ref(db, `${team}/votes/${name}`), value);
}

// 2. Lógica de Navegación

// NUEVA FUNCIÓN: Unirse a sala desde el input o la lista.
window.checkAndSelectRoom = function() {
    const roomNameInput = document.getElementById('room-name-input');
    const roomName = roomNameInput.value.trim();
    if (!roomName) {
        showError('¡Debes ingresar un nombre de sala!');
        return;
    }
    selectTeam(roomName);
}

function selectTeam(selectedTeam) {
  team = selectedTeam.trim();
  document.getElementById('team-selection').classList.add('hidden');
  
  // Ocultar Javi 1 y mostrar Javi 2
  document.getElementById('javi1-container')?.classList.add('hidden'); 
  const javi2Container = document.getElementById('javi2-container');
  javi2Container.classList.remove('hidden');

  const text2 = "El rol de PO será quien manejará el poker. ¡Solo se permite un \"PO\" por sala! Recordá que una vez mostrado el voto no podés cambiarlo. ¡A votar!";
  typewriterEffect('javi2-dialog', text2);

  document.getElementById('role-selection').classList.remove('hidden');
}

function selectRole(r) {
  role = r;
  document.getElementById('role-selection').classList.add('hidden');
  document.getElementById('javi2-container')?.classList.add('hidden');
  document.getElementById('name-input').classList.remove('hidden');
}

// Función que debe ser global para el onclick en el HTML
window.confirmName = async function confirmName() {
  name = document.getElementById('username').value.trim();
  if (!name) {
       showError('¡Debes ingresar un nombre!');
       return;
  }
    
  // Comprobar PO activo
  if (role === 'po') {
    const connectionsSnapshot = await get(ref(db, `${team}/connections`));
    const connections = connectionsSnapshot.val() || {};
    const now = Date.now();
    const activePO = Object.entries(connections).find(([userName, data]) => 
      userName !== name && data.role === 'po' && now - data.lastSeen < PARTICIPANT_TIMEOUT_MS
    );
    if (activePO) {
      showError(`Ya hay un PO activo en esta sesión: ${activePO[0]}`);
      return;
    }
    
    // MODIFICADO: Establecer Título de Sala por defecto al crear/unirse como PO
    get(ref(db, `${team}/meta/roomTitle`)).then(snap => {
        if (!snap.exists() || !snap.val()) {
            set(ref(db, `${team}/meta/roomTitle`), team);
        }
    });
  }

  // Cleanup roulette when entering a room
  if (typeof clearAllNames === 'function') {
    clearAllNames();
    document.getElementById('roulette-container')?.classList.remove('visible');
    document.getElementById('roulette-toggle-btn')?.classList.add('hidden');
  }

  document.getElementById('name-input').classList.add('hidden');
  document.getElementById('voting-container').classList.remove('hidden');
  document.getElementById('help-button').classList.remove('hidden');

  actualizarConexion();
  if (role !== 'spectator') {
    set(ref(db, `${team}/votes/${name}`), '');
  }

  // Establecer onDisconnect para el usuario y el PO
  onDisconnect(ref(db, `${team}/connections/${name}`)).remove();

  if (role === 'po') {
      onDisconnect(ref(db, `${team}/meta/roomTitle`)).cancel();
      onDisconnect(ref(db, `${team}/meta/timer`)).cancel();
      onDisconnect(ref(db, `${team}/meta/isAnonymousMode`)).cancel();
      // El onDisconnect para activeRooms/poName se maneja en actualizarConexion
  }

  const roleText = { po: '👑 PO', member: '🎯 Team Member', spectator: '👀 Espectador' };
  document.getElementById('welcome').innerText = `🎉 Hola, ${name} (${roleText[role]})`;

  if (role === 'po') {
    document.getElementById('po-controls').classList.remove('hidden');
    // **CORRECCIÓN DE ACTIVACIÓN:** Llamada al tutorial si es PO y no se ha completado
    if (localStorage.getItem(`${PO_TUTORIAL_KEY}_${name}`) !== 'true') {
        startPOTutorial(name);
    }
  }
  if (role === 'member') showCards();

  listenToEverything();
}

// 3. Controles del PO (expuestos globalmente para onclick)

window.addTask = function() { // Funcionalidad 1: Añadir Tarea al Backlog
    const title = document.getElementById('new-task-input').value.trim();
    if (!title) return;
    const newKey = push(ref(db, `${team}/backlog`)).key;
    set(ref(db, `${team}/backlog/${newKey}`), {
        id: newKey,
        title: title,
        status: 'pending'
    });
    document.getElementById('new-task-input').value = '';
}

window.setActiveTask = function(taskId) { // Funcionalidad 1: Seleccionar Tarea Activa
    get(ref(db, `${team}/backlog`)).then(snapshot => {
        const backlog = snapshot.val() || {};
        const updates = {};
        let newTitle = '';
        for (const [id, task] of Object.entries(backlog)) {
            if (id === taskId) {
                updates[`${team}/backlog/${id}/status`] = 'active';
                newTitle = task.title;
            } else if (task.status === 'active') {
                updates[`${team}/backlog/${id}/status`] = 'pending'; 
            }
        }
        resetVotes(); 
        update(ref(db), updates);
        set(ref(db, `${team}/meta/roomTitle`), newTitle);
    });
}

window.deleteTask = function(taskId) { // Funcionalidad 1: Eliminar Tarea
    remove(ref(db, `${team}/backlog/${taskId}`));
}

window.toggleAnonymousMode = function(isAnonymous) { // Funcionalidad 5: Toggle Modo Anónimo
    set(ref(db, `${team}/meta/isAnonymousMode`), isAnonymous);
}

window.setRoomTitle = function() {
    const title = document.getElementById('room-title-input').value;
    set(ref(db, `${team}/meta/roomTitle`), title);
}

window.startTimer = function(duration) {
    const timerData = {
        startTime: Date.now(),
        duration: duration * 1000
    };
    set(ref(db, `${team}/meta/timer`), timerData);
}

window.revealVotes = function () {
  set(ref(db, `${team}/meta/revealed`), true);
}

window.resetVotes = function () {
  const updates = {};
  Object.keys(currentVotes).forEach(user => {
    updates[`${team}/votes/${user}`] = '';
  });
  update(ref(db), updates);
  set(ref(db, `${team}/meta/revealed`), false);
  set(ref(db, `${team}/meta/timer`), null);
  selectedCard = null;
  document.querySelectorAll('.card').forEach(card => card.classList.remove('selected'));
  document.getElementById('result')?.classList.add('hidden');
  document.getElementById('facilitation-alerts').innerHTML = '';
}

// MODIFICADO: Limpieza de participantes inactivos
window.resetParticipantes = function () {
  get(ref(db, `${team}/connections`)).then(connSnap => {
    const connections = connSnap.val() || {};
    const now = Date.now();
    const activeUsers = {};

    for (const [user, data] of Object.entries(connections)) {
      if (now - data.lastSeen < PARTICIPANT_TIMEOUT_MS) {
          activeUsers[user] = true;
      }
    }

    get(ref(db, `${team}/votes`)).then(votesSnap => {
      const votes = votesSnap.val() || {};
      const updates = {};

      for (const user of Object.keys(votes)) {
        if (!(user in activeUsers)) {
          updates[`${team}/votes/${user}`] = null;
        }
      }

      for (const user of Object.keys(connections)) {
        if (!(user in activeUsers)) {
          updates[`${team}/connections/${user}`] = null;
        }
      }

      update(ref(db), updates).then(() => {
          // Forzar una actualización de la metadata de la sala después de la limpieza
          actualizarConexion(); 
      });
      
      set(ref(db, `${team}/meta/revealed`), false);
    });
  });
}

// 4. Lógica de Renderizado

// NUEVA FUNCIÓN: Renderizar la lista de salas activas
function renderActiveRooms(roomsData = {}) {
    const listContainer = document.getElementById('active-rooms-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Limpiar lista
    let foundActiveRooms = false;

    // Generar la lista de salas
    Object.entries(roomsData).forEach(([roomName, roomMeta]) => {
        // La sala está activa si su lastActive es reciente
        if (roomMeta.lastActive && (Date.now() - roomMeta.lastActive < ROOM_TIMEOUT_MS)) {
            foundActiveRooms = true;
            const item = document.createElement('div');
            item.className = 'room-item';
            // Se usa la función global para unirse
            item.onclick = () => selectTeam(roomName); 
            
            const nameSpan = document.createElement('p');
            nameSpan.className = 'room-item-name';
            nameSpan.textContent = roomName;
            
            const detailsDiv = document.createElement('p');
            detailsDiv.className = 'room-item-details';
            
            const poName = roomMeta.poName && roomMeta.poName !== 'Desconectado' ? roomMeta.poName : 'N/A';
            const memberCount = roomMeta.memberCount || 0;
            
            detailsDiv.innerHTML = `👑 PO: <b>${poName}</b> | 👥 Activos: <b>${memberCount}</b>`;

            item.appendChild(nameSpan);
            item.appendChild(detailsDiv);
            listContainer.appendChild(item);
        }
    });

    if (!foundActiveRooms) {
       listContainer.innerHTML = '<p style="font-size: 1rem; color: #f0f0f0;">No hay salas activas. ¡Crea una!</p>';
    }
}


// Renderizar Backlog
function renderBacklog(backlog = {}) {
    const listContainer = document.getElementById('backlog-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    currentActiveTask = null;

    Object.entries(backlog).forEach(([id, task]) => {
        if (task.status === 'active') {
            currentActiveTask = task;
        }
        const item = document.createElement('div');
        item.className = `backlog-item ${task.status === 'active' ? 'active-task' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'backlog-title';
        titleSpan.textContent = task.title;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'backlog-actions';
        
        if (role === 'po') {
            if (task.status !== 'active') {
                const voteButton = document.createElement('button');
                voteButton.textContent = 'Votar';
                voteButton.className = 'btn-vote-task';
                // Se usa la función global setActiveTask
                voteButton.onclick = () => setActiveTask(id); 
                actionsDiv.appendChild(voteButton);
            }
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Eliminar';
            deleteButton.className = 'btn-delete-task';
            // Se usa la función global deleteTask
            deleteButton.onclick = () => deleteTask(id); 
            actionsDiv.appendChild(deleteButton);
        }
        
        item.appendChild(titleSpan);
        item.appendChild(actionsDiv);
        listContainer.appendChild(item);
    });
}

// Renderizado de la mesa inteligente
function renderMesa(personas, isAnonymous = false) {
  const container = document.getElementById('mesa-container');
  if (!container) return;
  
  const radiusX = container.offsetWidth / 2 - 40;
  const radiusY = container.offsetHeight / 2 - 40;
  const centerX = container.offsetWidth / 2;
  const centerY = container.offsetHeight / 2;
  const total = personas.length;

  const activeNames = new Set(personas.map(p => p.nombre));
  
  // Asignar alias para modo anónimo (solo miembros/POs)
  const anonymousAliases = {};
  personas.filter(p => p.role !== 'spectator').forEach((p, i) => {
      anonymousAliases[p.nombre] = `Participante ${i + 1}`;
  });
  
  // Eliminar participantes que ya no están
  container.querySelectorAll('.persona').forEach(el => {
      if (!activeNames.has(el.dataset.name)) {
          el.remove();
      }
  });

  // Añadir o actualizar participantes
  personas.forEach((persona, i) => {
      const angle = (2 * Math.PI * i) / total;
      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY + radiusY * Math.sin(angle);
      
      let div = container.querySelector(`#persona-${persona.nombre.replace(/\s+/g, '-')}`);
      
      if (!div) { 
          div = document.createElement('div');
          div.id = `persona-${persona.nombre.replace(/\s+/g, '-')}`;
          div.dataset.name = persona.nombre;
          div.className = `persona ${persona.role} entering`; 

          const icon = document.createElement('div');
          icon.className = 'icono';
          const label = document.createElement('div');
          label.className = 'nombre';
          
          div.appendChild(icon);
          div.appendChild(label);
          container.appendChild(div);
      }
      
      div.classList.toggle('voted', persona.voted);
      div.classList.toggle('inactive', persona.inactive);
      div.classList.remove('po', 'spectator');
      div.classList.add(persona.role);
      
      const iconEl = div.querySelector('.icono');
      iconEl.textContent = persona.avatar || '👤'; 
      if(persona.role === 'po') iconEl.textContent = ''; 

      const labelEl = div.querySelector('.nombre');
      if (isAnonymous && !revealed && persona.role !== 'spectator') {
           labelEl.textContent = anonymousAliases[persona.nombre] || 'Anónimo';
      } else {
           labelEl.textContent = persona.nombre;
      }

      div.style.left = `${x}px`;
      div.style.top = `${y}px`;
  });
}

// Actualización de la tabla de votos y lógica de facilitación
function updateVoteTable(votes = {}, isRevealed, connections = {}, isAnonymous = false) {
  const table = document.getElementById('vote-table'); // Obtener la tabla
  const tbody = table?.querySelector('tbody');
  const alertsContainer = document.getElementById('facilitation-alerts');
  const resultDiv = document.getElementById('result');

  if (!tbody || !alertsContainer || !resultDiv || !table) return;

  tbody.innerHTML = '';
  alertsContainer.innerHTML = ''; 
  table.className = ''; // Limpiar clases anteriores

  const voteCount = {};
  const numericVotes = [];

  // 1. Filtrar y contar votantes válidos (Miembros y POs que no son espectadores)
  const activeParticipants = Object.entries(connections)
      .filter(([user, data]) => data.role !== 'spectator' && Date.now() - data.lastSeen < PARTICIPANT_TIMEOUT_MS);
      
  const totalVoters = activeParticipants.length;
  
  // *** MODIFICACIÓN PARA COLUMNAS MÚLTIPLES (CÁLCULO Y APLICACIÓN DE CLASE) ***
  let columns;
  if (totalVoters > 10) {
      columns = 3;
      table.classList.add('multi-columna-3');
  } else if (totalVoters > 5) {
      columns = 2;
      table.classList.add('multi-columna-2');
  } else {
      columns = 1;
      table.classList.add('multi-columna-1');
  }
  // **********************************************

  // 2. Conteo de votos y cálculo de extremos
  Object.entries(votes).forEach(([user, card]) => {
    const userRole = connections[user]?.role;
    if (card !== '' && card !== null && (userRole === 'member' || userRole === 'po')) {
        voteCount[card] = (voteCount[card] || 0) + 1;
        const numericValue = parseFloat(card);
        if (!isNaN(numericValue)) {
            numericVotes.push({ user, card: numericValue });
        }
    }
  });
  
  let minNumeric = Infinity, maxNumeric = -Infinity;
  const questionMarkVoters = [];
  const coffeeVoters = [];
  
  if (numericVotes.length > 0) {
      minNumeric = Math.min(...numericVotes.map(v => v.card));
      maxNumeric = Math.max(...numericVotes.map(v => v.card));
  }

  // 3. Renderizar tabla
  let anonymousCounter = 1;
  
  activeParticipants.forEach(([user, data]) => {
    const card = votes[user] || '';
    const role = data.role;
    
    let voted = card !== '';
    let rowClass = '';
    
    // Determinar votantes de extremos/especiales
    if (isRevealed) {
        const numericCard = parseFloat(card);
        if (!isNaN(numericCard)) {
            if (numericCard === maxNumeric && maxNumeric !== -Infinity) {
                rowClass = 'highlight-high';
            } else if (numericCard === minNumeric && minNumeric !== Infinity) {
                rowClass = 'highlight-low';
            }
        } else if (card === '?') {
            rowClass = 'highlight-question';
            questionMarkVoters.push(user);
        } else if (card === '☕') {
            coffeeVoters.push(user);
        }
    }
    
    const tr = document.createElement('tr');
    tr.className = rowClass;
    
    const tdName = document.createElement('td');
    const tdCard = document.createElement('td');
    
    let displayName = user;
    
    // Alias para el modo anónimo
    if (isAnonymous && role !== 'spectator') {
        // Se incrementa el contador de forma consistente para los participantes activos
        displayName = `Participante ${anonymousCounter++}`;
    }

    tdName.textContent = displayName;

    // Asegurar que el voto siempre va en la segunda celda
    tdCard.textContent = isRevealed ? card : (voted ? '🂠' : '—');
    
    tr.appendChild(tdName);
    tr.appendChild(tdCard);
    tbody.appendChild(tr);
  });
  
  // 4. Lógica de Alertas y Resultados (Funcionalidad 2 & 4)
  if (isRevealed && totalVoters > 0) {
    
    // 1. Alerta de Dispersión (Funcionalidad 2)
    if (maxNumeric !== -Infinity && minNumeric !== Infinity) {
        const disparity = maxNumeric - minNumeric;
        if (disparity >= minNumeric * 2 && maxNumeric > 5) { 
            const alertDiv = document.createElement('div');
            alertDiv.className = 'error-message alert-discrepancy';
            alertDiv.innerHTML = `🚨 <b>Gran Discrepancia Detectada (${minNumeric} a ${maxNumeric})</b>! Se recomienda discutir.`;
            alertsContainer.appendChild(alertDiv);
        }
    }

    // 2. Alerta de Pregunta (?) (Funcionalidad 4)
    if (questionMarkVoters.length > 0) {
       const alertDiv = document.createElement('div');
       alertDiv.className = 'error-message highlight-question';
       alertDiv.innerHTML = `❓ <b>¡Hay dudas pendientes de resolver!</b> ${questionMarkVoters.length} votante(s) con '?'`;
       alertsContainer.appendChild(alertDiv);
    }
    
    // 3. Alerta de Café (☕) (Funcionalidad 4)
    const coffeePercentage = (coffeeVoters.length / totalVoters) * 100;
    if (coffeePercentage >= 30) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'error-message alert-break';
        alertDiv.innerHTML = `☕ <b>¡Alerta de Café!</b> ${coffeeVoters.length} votante(s) (${Math.round(coffeePercentage)}%) sugieren un descanso.`;
        alertsContainer.appendChild(alertDiv);
    }
    
    // 4. Resultado Principal
    const validVotes = Object.entries(voteCount).filter(([card]) => card !== '☕' && card !== '?');
    if (validVotes.length > 0) {
        const sorted = validVotes.sort((a, b) => b[1] - a[1]);
        const top = sorted[0];
        
        if (isAnonymous) { 
             let resultText = '🗳️ <b>Resultados Agrupados</b>:<br>';
             sorted.forEach(([card, count]) => {
                 resultText += `${count} voto(s) para <b>${card}</b><br>`;
             });
             resultDiv.innerHTML = `🎯 Mayor Consenso: ${top[0]} (${top[1]} votos)<hr style="margin: 0.5rem 0;">${resultText}`;
        } else {
             resultDiv.textContent = `🎯 Puntaje más votado: ${top[0]} (${top[1]} votos)`;
        }
        
        resultDiv.classList.remove('hidden');
    } else {
      resultDiv.classList.add('hidden');
    }
  } else {
    resultDiv.classList.add('hidden');
  }
}

// 5. Listeners de Firebase

// NUEVO LISTENER: Salas Activas
function listenToActiveRooms() {
    onValue(ref(db, `activeRooms`), (snapshot) => {
        const rooms = snapshot.val() || {};
        renderActiveRooms(rooms);
    });
}


function listenToEverything() {
  
  // Listener del Temporizador
  onValue(ref(db, `${team}/meta/timer`), (snapshot) => {
      const timerData = snapshot.val();
      const timerDisplay = document.getElementById('timer-display');
      if (!timerDisplay) return;

      clearInterval(timerInterval);

      if (timerData) {
          const endTime = timerData.startTime + timerData.duration;
          
          function updateTimer(isInitialCheck = false) { 
              const now = Date.now();
              const timeLeft = Math.round((endTime - now) / 1000);
              
              if (timeLeft > 0) {
                  timerDisplay.textContent = timeLeft;
                  timerDisplay.classList.remove('hidden');
              } else {
                  timerDisplay.classList.add('hidden');
                  clearInterval(timerInterval);
                  
                  if (!isInitialCheck) {
                       playTimerEndSound(); 
                  }

                  if (role === 'po') {
                      set(ref(db, `${team}/meta/timer`), null);
                  }
                  
                  return timeLeft; 
              }
              return timeLeft;
          }
          
          const initialTimeLeft = updateTimer(true); 

          if (initialTimeLeft > 0) {
              timerInterval = setInterval(updateTimer, 1000);
          }

      } else {
          timerDisplay.classList.add('hidden');
      }
  });
  
  // Listener del Backlog (Funcionalidad 1)
  onValue(ref(db, `${team}/backlog`), (snapshot) => { 
      const backlog = snapshot.val() || {};
      renderBacklog(backlog);
  });

  // Listener de Votos
  onValue(ref(db, `${team}/votes`), (snapshot) => {
    const data = snapshot.val() || {};
    const currentUserCard = data[name];
    if (!currentUserCard && !revealed) {
      selectedCard = null;
      document.querySelectorAll('.card').forEach(card => card.classList.remove('selected'));
    }
    currentVotes = data;

    // Se necesita el estado de conexión y modo anónimo para una actualización completa
    get(ref(db, `${team}/meta/isAnonymousMode`)).then(snap => {
        const isAnonymous = snap.val() === true;
        updateVoteTable(currentVotes, revealed, allConnections, isAnonymous);
        // Actualizar la mesa después de obtener votos
        renderMesa(Object.entries(allConnections)
          .filter(([_, data]) => Date.now() - data.lastSeen < PARTICIPANT_TIMEOUT_MS)
          .map(([nombre, data]) => ({ nombre, role: data.role, avatar: data.avatar, voted: currentVotes[nombre] && currentVotes[nombre] !== '' })),
          isAnonymous 
        );
    });
  });

  // Listener de Revelado
  onValue(ref(db, `${team}/meta/revealed`), (snapshot) => {
    revealed = snapshot.val() === true;
    updateCardsState();
    
    get(ref(db, `${team}/meta/isAnonymousMode`)).then(snap => {
        const isAnonymous = snap.val() === true;
        updateVoteTable(currentVotes, revealed, allConnections, isAnonymous);
    });
  });

  // Listener de Modo Anónimo (Funcionalidad 5)
  onValue(ref(db, `${team}/meta/isAnonymousMode`), (snapshot) => { 
      const isAnonymous = snapshot.val() === true;
      const anonToggle = document.getElementById('anonymous-mode-toggle');
      if (role === 'po' && anonToggle) {
          anonToggle.checked = isAnonymous;
      }
      updateVoteTable(currentVotes, revealed, allConnections, isAnonymous);
      
      // Volver a renderizar mesa con el estado anónimo actualizado
      renderMesa(Object.entries(allConnections)
          .filter(([_, data]) => Date.now() - data.lastSeen < PARTICIPANT_TIMEOUT_MS)
          .map(([nombre, data]) => ({ nombre, role: data.role, avatar: data.avatar, voted: currentVotes[nombre] && currentVotes[nombre] !== '' })), 
          isAnonymous
      );
  });

  // Listener de Conexiones
  onValue(ref(db, `${team}/connections`), (snapshot) => {
    const conexiones = snapshot.val() || {};
    allConnections = conexiones;
    const now = Date.now();
    const activos = Object.entries(conexiones)
      .filter(([_, data]) => now - data.lastSeen < PARTICIPANT_TIMEOUT_MS)
      .map(([nombre, data]) => ({ 
          nombre, 
          role: data.role, 
          avatar: data.avatar, 
          voted: currentVotes[nombre] && currentVotes[nombre] !== '', 
          inactive: now - data.lastSeen > PARTICIPANT_TIMEOUT_MS 
      }));
        
    get(ref(db, `${team}/meta/isAnonymousMode`)).then(snap => {
        const isAnonymous = snap.val() === true;
        renderMesa(activos, isAnonymous);
    });
  });

  // Listener del Título de Sala
  onValue(ref(db, `${team}/meta/roomTitle`), (snapshot) => {
      const titleDisplay = document.getElementById('room-title-display');
      if (!titleDisplay) return;
      
      let title = snapshot.val();
      
      // Si hay una tarea activa, la sobreescribe (Funcionalidad 1)
      if (currentActiveTask) {
          title = currentActiveTask.title;
      }
      
      if (title) {
          titleDisplay.textContent = `📝 Tema: ${title}`;
          titleDisplay.classList.remove('hidden');
          
          // Además, actualizar el input del PO si existe
          const roomTitleInput = document.getElementById('room-title-input');
          if (roomTitleInput && role === 'po') {
              roomTitleInput.value = title;
          }
      } else {
          titleDisplay.textContent = '📝 Tarea no seleccionada';
      }
  });
}


// === Lógica del Tutorial del PO ===

const tutorialSteps = [
    {
        selector: '#btn-reveal-votes',
        message: "¡Hola, <b>%NAME%</b>! 🎉 Haz clic aquí para <b>mostrar</b> las estimaciones de tu equipo. ¡Descubre si hay consenso!",
        image: 'fran2.png', // Imagen de saludo/final
        dialogPosition: 'bottom'
    },
    {
        selector: '#btn-reset-votes',
        message: "Si el equipo necesita volver a votar, usa <b>Reiniciar Votación</b>. ¡Empecemos de nuevo con el mismo tema!",
        image: 'fran1.png',
        dialogPosition: 'bottom'
    },
    {
        selector: '#btn-reset-participants',
        message: "Para <b>limpiar la mesa</b> y expulsar a participantes inactivos, usa esta opción. Útil al iniciar.",
        image: 'fran1.png',
        dialogPosition: 'bottom'
    },
    {
        selector: '#room-title-display',
        message: "Este es el <b>título de la tarea actual</b>. Asegúrate que todos entiendan de qué se trata.",
        image: 'fran1.png',
        dialogPosition: 'top'
    },
    {
        selector: '#backlog-management',
        message: "Aquí puedes <b>gestionar todas las tareas</b> a votar. ¡Selecciona la siguiente para el equipo!",
        image: 'fran1.png',
        dialogPosition: 'top'
    },
    {
        selector: '#po-timer-controls',
        message: "Usa el <b>temporizador</b> para discusiones o para limitar el tiempo de votación.",
        image: 'fran1.png',
        dialogPosition: 'top'
    },
    {
        selector: '#anon-toggle-group',
        message: "Activa el <b>Modo Anónimo</b> para votaciones sin revelar nombres. ¡Fomenta la honestidad!",
        image: 'fran1.png',
        dialogPosition: 'top'
    },
    {
        selector: null, // Paso final sin foco
        message: "¡Listo! Ya tienes todas las herramientas para <b>liderar</b> esta votación. ¡Excelente sesión de Planning Poker! 🚀",
        image: 'fran2.png',
        dialogPosition: 'center',
        isFinal: true
    }
];

// **FUNCIÓN CORREGIDA:** Cálculo de posición del diálogo (al lado del elemento)
function calculateDialogPosition(rect, dialogEl, position) {
    const margin = 20;
    const dialogWidth = dialogEl.offsetWidth;
    const dialogHeight = dialogEl.offsetHeight;
    let top, left;

    // Default position (right side of the target element)
    top = rect.top + rect.height / 2 - dialogHeight / 2;
    left = rect.right + margin;
    
    // Check if it fits on the right, if not, try left.
    if (left + dialogWidth > window.innerWidth - margin) {
        left = rect.left - dialogWidth - margin; // Try left side
        if (left < margin) {
            // If it doesn't fit on the left either, position below the element.
            left = rect.left + rect.width / 2 - dialogWidth / 2;
            top = rect.bottom + margin;
        }
    }
    
    // Adjust Y position if too high/low
    top = Math.max(margin, Math.min(top, window.innerHeight - dialogHeight - margin));

    // Fallback for centered final step
    if (position === 'center') {
        top = window.innerHeight / 2 - dialogHeight / 2;
        left = window.innerWidth / 2 - dialogWidth / 2;
    }

    dialogEl.style.top = `${top}px`;
    dialogEl.style.left = `${left}px`;
}

// **FUNCIÓN CORREGIDA:** Lógica principal del tutorial
window.nextTutorialStep = function() {
    if (tutorialStep >= tutorialSteps.length) {
        // Fin del tutorial
        document.getElementById('tutorial-overlay').classList.add('hidden');
        localStorage.setItem(`${PO_TUTORIAL_KEY}_${name}`, 'true'); // Usar nombre para el flag
        return;
    }

    const step = tutorialSteps[tutorialStep];
    const overlay = document.getElementById('tutorial-overlay');
    const dialog = document.getElementById('tutorial-dialog');
    const spotlight = document.getElementById('tutorial-spotlight'); // Ahora es el anillo
    const messageEl = document.getElementById('tutorial-message');
    const counterEl = document.getElementById('tutorial-counter');
    const franImg = document.getElementById('tutorial-fran-img');

    // Actualizar contenido
    messageEl.innerHTML = step.message.replace('%NAME%', name);
    franImg.src = step.image;
    counterEl.textContent = step.isFinal ? '¡Terminado!' : `${tutorialStep + 1} / ${tutorialSteps.length - 1}`;
    
    // Primero, ocultar el anillo
    spotlight.style.opacity = 0;

    if (step.selector) {
        const element = document.querySelector(step.selector);
        if (element) {
            const rect = element.getBoundingClientRect();
            const padding = 15;
            
            // 1. Crear el agujero circular usando CSS Masking (zona transparente)
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            // Calcular radio basado en la dimensión más grande
            const radius = Math.max(rect.width, rect.height) / 2 + padding;

            // Aplica la máscara radial al overlay: el centro transparente (agujero)
            overlay.style.maskImage = `radial-gradient(circle ${radius}px at ${centerX}px ${centerY}px, transparent, black)`;
            overlay.style.webkitMaskImage = `radial-gradient(circle ${radius}px at ${centerX}px ${centerY}px, transparent, black)`;
            
            // 2. Posicionar el Anillo/Spotlight visual (#tutorial-spotlight)
            spotlight.style.width = `${radius * 2}px`;
            spotlight.style.height = `${radius * 2}px`;
            spotlight.style.top = `${centerY - radius}px`;
            spotlight.style.left = `${centerX - radius}px`;
            spotlight.style.borderRadius = '50%';
            spotlight.style.opacity = 1;

            // 3. Posicionar diálogo
            // El diálogo debe ser visible para calcular su posición
            dialog.style.opacity = '0';
            dialog.classList.remove('hidden');
            calculateDialogPosition(rect, dialog, step.dialogPosition);
            dialog.style.opacity = '1';
            
        } else {
            // Elemento no encontrado, paso al modo final/centrado
            overlay.style.maskImage = 'none';
            overlay.style.webkitMaskImage = 'none';
            spotlight.style.opacity = 0;
            
            dialog.style.top = '50%';
            dialog.style.left = '50%';
            dialog.style.transform = 'translate(-50%, -50%)';
        }
    } else {
         // Paso final: centrar diálogo, remover máscara y anillo
         overlay.style.maskImage = 'none';
         overlay.style.webkitMaskImage = 'none';
         spotlight.style.opacity = 0;
         
         dialog.style.top = '50%';
         dialog.style.left = '50%';
         dialog.style.transform = 'translate(-50%, -50%)';
    }

    tutorialStep++;
}

function startPOTutorial(username) {
    // **CORRECCIÓN DE ACTIVACIÓN:** Se usa el nombre del usuario para el flag de localStorage
    if (localStorage.getItem(`${PO_TUTORIAL_KEY}_${username}`) === 'true') return;

    tutorialStep = 0;
    const overlay = document.getElementById('tutorial-overlay');
    const dialog = document.getElementById('tutorial-dialog');
    
    // Inicializar y mostrar
    overlay.classList.remove('hidden');
    dialog.classList.remove('hidden');
    
    // Configurar listener para avanzar (se remueve al finalizar)
    overlay.addEventListener('click', window.nextTutorialStep);
    
    // Iniciar el primer paso
    window.nextTutorialStep();
}

// === ROULETTE FEATURE ===

// --- State and Constants ---
const ROULETTE_MAX_NAMES = 15;
const rouletteColors = ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#f368e0", "#ff9f43", "#0abde3", "#10ac84", "#54a0ff", "#5f27cd", "#c8d6e5", "#576574", "#01a3a4", "#ee5253", "#2e86de"];
let rouletteNames = [];
let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let spinAngleStart = 0;
let spinTime = 0;
let spinTimeTotal = 0;
let isSpinning = false;

// --- Core Functions ---
function drawRouletteWheel() {
    const rouletteCanvas = document.getElementById('roulette-canvas');
    if (!rouletteCanvas) return;
    const rouletteCtx = rouletteCanvas.getContext('2d');
    const outsideRadius = 110;
    const textRadius = 85;
    const insideRadius = 0;
    const centerX = rouletteCanvas.width / 2;
    const centerY = rouletteCanvas.height / 2;

    rouletteCtx.clearRect(0, 0, rouletteCanvas.width, rouletteCanvas.height);
    rouletteCtx.strokeStyle = "white";
    rouletteCtx.lineWidth = 2;
    
    if (rouletteNames.length === 0) {
        rouletteCtx.fillStyle = '#c8d6e5';
        rouletteCtx.beginPath();
        rouletteCtx.arc(centerX, centerY, outsideRadius, 0, 2 * Math.PI, false);
        rouletteCtx.fill();
        
        rouletteCtx.fillStyle = "#576574";
        rouletteCtx.font = 'bold 14px Poppins, sans-serif';
        rouletteCtx.textAlign = 'center';
        rouletteCtx.textBaseline = 'middle';
        rouletteCtx.fillText("Añade nombres", centerX, centerY);
        return;
    }

    arc = Math.PI / (rouletteNames.length / 2);

    for (let i = 0; i < rouletteNames.length; i++) {
        const angle = startAngle + i * arc;
        rouletteCtx.fillStyle = rouletteColors[i % rouletteColors.length];

        rouletteCtx.beginPath();
        rouletteCtx.arc(centerX, centerY, outsideRadius, angle, angle + arc, false);
        rouletteCtx.arc(centerX, centerY, insideRadius, angle + arc, angle, true);
        rouletteCtx.stroke();
        rouletteCtx.fill();

        rouletteCtx.save();
        rouletteCtx.fillStyle = "white";
        rouletteCtx.shadowColor = "rgba(0,0,0,0.2)";
        rouletteCtx.shadowBlur = 3;
        rouletteCtx.font = 'bold 12px Poppins, sans-serif';
        rouletteCtx.translate(centerX + Math.cos(angle + arc / 2) * textRadius,
                              centerY + Math.sin(angle + arc / 2) * textRadius);
        rouletteCtx.rotate(angle + arc / 2 + Math.PI / 2);
        const text = rouletteNames[i];
        rouletteCtx.fillText(text, -rouletteCtx.measureText(text).width / 2, 0);
        rouletteCtx.restore();
    }
}

function renderNameList() {
    const nameListDiv = document.getElementById('roulette-name-list');
    if(!nameListDiv) return;
    nameListDiv.innerHTML = '';
    rouletteNames.forEach((name, index) => {
        const item = document.createElement('div');
        item.className = 'roulette-name-item';
        item.innerHTML = `<span>${name}</span><button data-index="${index}">❌</button>`;
        nameListDiv.appendChild(item);
    });
}

function addName() {
    const nameInput = document.getElementById('roulette-name-input');
    const name = nameInput.value.trim();
    if (name && rouletteNames.length < ROULETTE_MAX_NAMES) {
        if (!rouletteNames.includes(name)) {
            rouletteNames.push(name);
            nameInput.value = '';
            renderNameList();
            drawRouletteWheel();
        }
    }
    nameInput.focus();
}

function removeName(index) {
    rouletteNames.splice(index, 1);
    renderNameList();
    drawRouletteWheel();
}

function clearAllNames() {
    rouletteNames = [];
    renderNameList();
    drawRouletteWheel();
    const winnerDiv = document.getElementById('roulette-winner');
    if(winnerDiv) winnerDiv.innerText = '';
}

function spin() {
    if (isSpinning || rouletteNames.length < 2) return;
    
    isSpinning = true;
    document.getElementById('btn-spin').disabled = true;
    document.getElementById('roulette-winner').innerText = 'Girando...';
    
    spinAngleStart = Math.random() * 10 + 10;
    spinTime = 0;
    spinTimeTotal = 4500 + Math.random() * 500; // 2.5-3 seconds spin

    rotateWheel();
}

function rotateWheel() {
    spinTime += 20;
    if (spinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
    }
    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180);
    drawRouletteWheel();
    spinTimeout = setTimeout(rotateWheel, 20);
}

function stopRotateWheel() {
    clearTimeout(spinTimeout);
    const rouletteCanvas = document.getElementById('roulette-canvas');
    const rouletteCtx = rouletteCanvas.getContext('2d');
    const degrees = startAngle * 180 / Math.PI + 90;
    const arcd = arc * 180 / Math.PI;
    const index = Math.floor((360 - degrees % 360) / arcd);
    
    rouletteCtx.save();
    rouletteCtx.font = 'bold 20px Poppins, sans-serif';
    const winner = rouletteNames[index];
    document.getElementById('roulette-winner').innerText = `Ganador: ${winner}`;
    rouletteCtx.restore();

    isSpinning = false;
    document.getElementById('btn-spin').disabled = false;
}

function easeOut(t, b, c, d) {
    const ts = (t /= d) * t;
    const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}

function setupRouletteListeners() {
    document.getElementById('roulette-toggle-btn').addEventListener('click', () => {
        document.getElementById('roulette-container').classList.toggle('visible');
    });

    document.getElementById('btn-add-name').addEventListener('click', addName);
    document.getElementById('roulette-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addName();
        }
    });

    document.getElementById('roulette-name-list').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = e.target.dataset.index;
            removeName(index);
        }
    });

    document.getElementById('btn-spin').addEventListener('click', spin);
    document.getElementById('btn-clear-names').addEventListener('click', clearAllNames);

    drawRouletteWheel(); // Initial draw
}

// === Inicialización de la Aplicación (DOM Ready) ===

document.addEventListener('DOMContentLoaded', () => {
    // 1. Efecto de carga
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.classList.add('hidden'), 500);
        }
    }, 1500);
    
    // 2. Javi 1 (Texto actualizado)
    const text1 = "Bienvenid@, Soy Javi y te invito al planning poker, ¡ingresá o seleccioná una sala!";
    typewriterEffect('javi1-dialog', text1);
    
    // 3. Inicio del fondo de cartas
    startFallingCards();
    
    // 4. Iniciar listener de salas activas
    listenToActiveRooms();
    
    // 5. Listeners de selección de rol (los botones de equipo fueron reemplazados)
    document.getElementById('btn-po')?.addEventListener('click', () => selectRole('po'));
    document.getElementById('btn-member')?.addEventListener('click', () => selectRole('member'));
    document.getElementById('btn-spectator')?.addEventListener('click', () => selectRole('spectator'));

    // 6. Listener de selección de avatar
    const avatarSelector = document.getElementById('avatar-selector');
    if (avatarSelector) {
        document.querySelectorAll('.avatar-option').forEach(el => {
            el.onclick = function() {
                document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected-avatar'));
                this.classList.add('selected-avatar');
                selectedAvatar = this.dataset.avatar;
            }
        });
        // Set default avatar on load
        document.querySelector(`.avatar-option[data-avatar="${selectedAvatar}"]`)?.classList.add('selected-avatar');
    }
    
    // 7. Mantenimiento de conexión (se activa después de iniciar sesión)
    setInterval(actualizarConexion, 10000);
    
    // 8. Listener del botón de ayuda (Modal Fibonacci)
    const helpButton = document.getElementById('help-button');
    const imageModal = document.getElementById('image-modal');
    if(helpButton && imageModal) {
        helpButton.addEventListener('click', () => { imageModal.classList.remove('hidden'); });
        imageModal.addEventListener('click', (event) => { if (event.target === imageModal) { imageModal.classList.add('hidden'); } });
    }

    // 9. Setup Roulette Listeners
    if (document.getElementById('roulette-container')) {
        setupRouletteListeners();
    }
});
