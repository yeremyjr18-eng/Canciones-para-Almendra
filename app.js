(() => {
  'use strict';
  const config = window.REGALO;
  const app = document.getElementById('app');
  const player = document.getElementById('player');
  const dialog = document.getElementById('song-dialog');
  const dialogContent = document.getElementById('dialog-content');
  const expected = 'TEQUIEROMUCHO';
  let roundIndex = 0;
  let selected = null;
  let screen = 'cover';
  let playingId = null;
  let playbackRequest = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const arrow = '<span class="arrow" aria-hidden="true">→</span>';
  const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l12-7z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
  const firstLetter = title => String(title).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').charAt(0).toUpperCase();

  function validate() {
    if (!config || !Array.isArray(config.rondas) || config.rondas.length !== 13) throw new Error('Necesitamos exactamente 13 rondas.');
    const ids = new Set();
    config.rondas.forEach((round, i) => {
      if (round.letra !== expected[i] || !Array.isArray(round.opciones) || round.opciones.length !== 3) throw new Error(`Revisa la letra y las tres opciones de la ronda ${i + 1}.`);
      const answer = round.opciones.find(song => song.id === round.correcta);
      if (!answer || firstLetter(answer.titulo) !== expected[i]) throw new Error(`La canción correcta de la ronda ${i + 1} debe empezar por ${expected[i]}.`);
      round.opciones.forEach(song => {
        if (!song.id || ids.has(song.id) || !song.titulo) throw new Error(`Revisa los títulos e identificadores de la ronda ${i + 1}.`);
        ids.add(song.id);
        if (!config.modoDemo && !song.audio) throw new Error(`Falta el archivo de audio de «${song.titulo}». Completa canciones.js antes de desactivar el modo demo.`);
      });
    });
  }

  function background(path) {
    document.body.style.backgroundImage = path ? `linear-gradient(rgba(247,242,235,.18),rgba(247,242,235,.28)),url(${JSON.stringify(path)})` : '';
  }

  function mount(html, name, image = '') {
    stopAudio();
    screen = name;
    document.body.dataset.screen = name;
    document.body.classList.toggle('has-background', Boolean(image));
    background(image);
    app.innerHTML = `<section class="screen ${name}">${html}</section>`;
    if (name !== 'cover') {
      app.focus({preventScroll:true});
      window.scrollTo({top:0,behavior:'instant'});
    }
  }

  function demoNote() {
    return config.modoDemo ? '<p class="demo-note"><span class="demo-tag">VISTA PREVIA</span> Las 39 canciones y las 13 preguntas ya están listas. Los mensajes de acierto siguen siendo provisionales.</p>' : '';
  }

  function showCover() {
    roundIndex = 0;
    selected = null;
    const title = config.titulo === 'De mí para ti, con cariño' ? 'De mí para ti,<br><em>con cariño.</em>' : escape(config.titulo);
    mount(`<div class="hero">
      <div class="hero-copy"><p class="eyebrow">UN PEQUEÑO REGALO PARA TI</p><h1>${title}</h1><p class="hero-description">${escape(config.introduccion)}</p><button class="primary" data-action="start">Siguiente ${arrow}</button><p class="hero-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7H4zm16 0h2v7h-5v-7h3z"/></svg> Ponte tus audífonos. Esto se escucha mejor así.</p></div>
      <div class="letter-scene" aria-hidden="true"><div class="letter-halo"></div><div class="letter"><span class="letter-small">ESTO ES PARA TI</span><span class="letter-heart">♡</span><span class="letter-script">con todo mi cariño</span><span class="letter-line"></span><span class="letter-bottom">13 canciones · algo que decirte</span></div><span class="floating-note note-one">nuestra pequeña banda sonora ♫</span><span class="floating-note note-two">♪</span><span class="sparkle sparkle-one">✧</span><span class="sparkle sparkle-two">✦</span></div>
    </div>${demoNote()}`, 'cover', config.fondoPortada);
  }

  function art(song, i) {
    return `<div class="record-art art-${i % 3 + 1}" data-art="${escape(song.id)}"><span class="track-number">LADO ${String(i + 1).padStart(2,'0')}</span><div class="record" aria-hidden="true"></div>${song.portada ? `<img src="${escape(song.portada)}" alt="" loading="lazy">` : ''}<button class="play-button" type="button" ${!song.audio ? 'disabled title="Audio pendiente de añadir"' : ''} data-play="${escape(song.id)}" aria-label="Escuchar ${escape(song.titulo)}" aria-pressed="false">${playIcon}</button></div>`;
  }

  function showRound() {
    const round = config.rondas[roundIndex];
    selected = null;
    const progress = config.rondas.map((_,i) => `<span class="${i < roundIndex ? 'done' : i === roundIndex ? 'current' : ''}"></span>`).join('');
    const cards = round.opciones.map((song,i) => `<article class="song-card">${art(song,i)}<div class="track-details"><h2>${escape(song.titulo)}</h2><p>${escape(song.artista)}</p></div><label class="choice"><input type="radio" name="song" value="${escape(song.id)}" aria-label="Elegir ${escape(song.titulo)}"><span class="choice-label">Elegir esta canción</span></label></article>`).join('');
    mount(`<div class="round-top"><span class="round-counter">CANCIÓN <strong>${String(roundIndex + 1).padStart(2,'0')}</strong> / 13</span><div class="progress" role="progressbar" aria-label="Rondas completadas" aria-valuemin="0" aria-valuemax="13" aria-valuenow="${roundIndex}">${progress}</div></div>
      <div class="round-heading"><p class="eyebrow">A VER SI ME CONOCES TANTO…</p><h1>${escape(round.pregunta)}</h1><p>Escucha las tres canciones y elige la que crees que pensé para ti.</p></div>
      <fieldset class="song-grid"><legend class="sr-only">Elige una de las tres canciones</legend>${cards}</fieldset>
      <div class="playback-panel"><p class="playback-status" role="status">Dale al play. Aquí no hay prisa.</p><div class="seek-wrap"><label class="sr-only" for="seek">Posición de la canción</label><input id="seek" type="range" min="0" max="100" value="0" step="0.1" disabled><span class="time-label" id="time-label">0:00 / 0:00</span></div></div>
      <div class="round-actions"><p class="selection-hint" id="selection-hint" aria-live="polite">Una de estas tiene un pedacito de nosotros.</p><button class="primary" data-action="check" disabled>Siguiente ${arrow}</button></div>${demoNote()}`, 'round', round.fondo);
  }

  function checkAnswer() {
    if (!selected || screen !== 'round') return;
    const round = config.rondas[roundIndex];
    if (selected !== round.correcta) {
      mount(`<div class="feedback"><div class="feedback-symbol" aria-hidden="true">☁</div><p class="eyebrow">UY… ESA NO ERA</p><h1>${escape(config.mensajeError)}</h1><p class="feedback-sub">${escape(config.ayudaError)}</p><button class="primary" data-action="retry">Volver a intentarlo <span aria-hidden="true">↻</span></button></div>`, 'incorrect', round.fondo);
      return;
    }
    const song = round.opciones.find(s => s.id === round.correcta);
    mount(`<div class="feedback"><div class="feedback-symbol" aria-hidden="true">♡</div><p class="eyebrow">SÍ, ESA ERA · ${String(roundIndex + 1).padStart(2,'0')} / 13</p><h1>${escape(round.tituloAcierto || "Sabía que la encontrarías.")}</h1><p class="feedback-message">${escape(round.mensaje)}</p><span class="correct-song">♫ ${escape(song.titulo)} · ${escape(song.artista)}</span><button class="primary" data-action="next">Siguiente ${arrow}</button><span class="note-label">${roundIndex === 12 ? "Todavía me queda algo por decirte…" : "un recuerdo más para nosotros"}</span></div>`, 'correct', round.fondo);
  }

  function showClue() {
    mount(`<div class="feedback"><div class="feedback-symbol" aria-hidden="true">✧</div><p class="eyebrow">LAS CANCIONES GUARDABAN UN SECRETO</p><h1>${escape(config.pistaFinal)}</h1><p class="feedback-message">${escape(config.explicacionFinal)}</p><button class="primary" data-action="reveal">Siguiente ${arrow}</button></div>`, 'clue', config.fondoRevelacion || config.fondoFinal);
  }

  function showReveal() {
    let index = 0;
    const words = ['TE','QUIERO','MUCHO'].map(word => `<div class="letter-word">${[...word].map(letter => {
      const i = index++;
      return `<button class="letter-button" data-letter="${i}" style="--i:${i}" aria-label="Letra ${letter}, escuchar canción ${i + 1}">${letter}<small aria-hidden="true">♫</small></button>`;
    }).join('')}</div>`).join('');
    mount(`<p class="eyebrow">TRECE CANCIONES. UN SOLO MENSAJE.</p><h1>Todo esto era para decirte…</h1><div class="letter-words" role="group" aria-label="TE QUIERO MUCHO. Cada letra abre una canción.">${words}</div><p class="reveal-description">${escape(config.dedicatoriaFinal)}</p><p class="reveal-hint">Toca cada letra para volver a escuchar su canción. ♡</p><button class="text-button" data-action="restart">Volver a abrir mi regalo</button>`, 'reveal', config.fondoFinal);
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.setAttribute('aria-hidden','true');
    confetti.innerHTML = Array.from({length:22},(_,i) => `<span style="--x:${(i*37)%100}%;--size:${12+(i%4)*6}px;--delay:${(i%7)*.19}s">${i%3 ? '♡' : '✦'}</span>`).join('');
    app.append(confetti);
    setTimeout(() => confetti.remove(),6000);
  }

  function showSong(i) {
    if (screen !== 'reveal' || !Number.isInteger(i) || !config.rondas[i]) return;
    stopAudio();
    const round = config.rondas[i];
    const song = round.opciones.find(s => s.id === round.correcta);
    dialogContent.innerHTML = `<p class="eyebrow">${escape(round.letra)} · RECUERDO ${String(i + 1).padStart(2,'0')}</p>${art(song,i)}<h2 id="dialog-title">${escape(song.titulo)}</h2><p class="dialog-artist">${escape(song.artista)}</p><p class="dialog-dedication">${escape(round.tituloAcierto || "")}</p><p class="dialog-memory">${escape(round.mensaje)}</p><p class="playback-status" role="status">Pulsa play para escuchar este recuerdo.</p>`;
    dialog.showModal();
  }

  function status(message) {
    const scope = dialog.open ? dialog : app;
    const output = scope.querySelector('.playback-status');
    if (output) output.textContent = message;
  }

  function paintPlayback() {
    document.querySelectorAll('[data-play]').forEach(button => {
      const active = button.dataset.play === playingId && !player.paused;
      const song = config.rondas.flatMap(r => r.opciones).find(s => s.id === button.dataset.play);
      button.innerHTML = active ? pauseIcon : playIcon;
      button.setAttribute('aria-label', `${active ? 'Pausar' : 'Escuchar'} ${song?.titulo || 'canción'}`);
      button.setAttribute('aria-pressed', String(active));
      button.closest('.record-art').classList.toggle('is-playing',active);
    });
  }

  function stopAudio() {
    playbackRequest++;
    player.pause();
    player.removeAttribute('src');
    player.load();
    playingId = null;
    paintPlayback();
    updateTime();
  }

  async function toggleSong(id) {
    const song = config.rondas.flatMap(r => r.opciones).find(s => s.id === id);
    if (!song) return;
    if (playingId === id && !player.paused) {
      playbackRequest++;
      player.pause(); paintPlayback(); status(`En pausa · ${song.titulo}`); return;
    }
    const sameSong = playingId === id && Boolean(player.getAttribute('src'));
    if (!sameSong) stopAudio();
    const request = ++playbackRequest;
    playingId = id;
    try {
      if (!song.audio) {
        status('Esta opción todavía está pendiente de añadir.');
        return;
      }
      if (!sameSong) player.src = song.audio;
      status(`Cargando · ${song.titulo}`);
      await player.play();
      if (request !== playbackRequest) return;
      paintPlayback(); status(`Escuchando · ${song.titulo}`);
    } catch (error) {
      if (request !== playbackRequest) return;
      paintPlayback();
      status(error.name === 'NotAllowedError' ? 'Pulsa play de nuevo para permitir el sonido.' : 'No se pudo abrir el audio. Revisa el archivo o su enlace en canciones.js.');
    }
  }

  function clock(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  }

  function updateTime() {
    const seek = document.getElementById('seek');
    const time = document.getElementById('time-label');
    if (!seek || !time) return;
    const duration = player.duration;
    seek.disabled = !Number.isFinite(duration) || duration <= 0;
    seek.value = seek.disabled ? 0 : (player.currentTime/duration)*100;
    time.textContent = `${clock(player.currentTime)} / ${clock(duration)}`;
  }

  document.addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.play) { toggleSong(button.dataset.play); return; }
    if (button.hasAttribute('data-letter')) { showSong(Number(button.dataset.letter)); return; }
    switch (button.dataset.action) {
      case 'start': showRound(); break;
      case 'check': checkAnswer(); break;
      case 'retry': showRound(); break;
      case 'next':
        if (screen !== 'correct') return;
        if (roundIndex < 12) { roundIndex++; showRound(); } else showClue();
        break;
      case 'reveal': showReveal(); break;
      case 'restart': showCover(); break;
    }
  });
  app.addEventListener('change',event => {
    if (event.target.name !== 'song' || screen !== 'round') return;
    selected = event.target.value;
    app.querySelector('[data-action="check"]').disabled = false;
    document.getElementById('selection-hint').textContent = '¿Esa es tu elegida? Vamos a descubrirlo.';
  });
  app.addEventListener('input',event => {
    if (event.target.id === 'seek' && Number.isFinite(player.duration)) player.currentTime = Number(event.target.value)*player.duration/100;
  });
  document.getElementById('close-dialog').addEventListener('click',() => dialog.close());
  dialog.addEventListener('close',stopAudio);
  dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  player.addEventListener('timeupdate',updateTime);
  player.addEventListener('loadedmetadata',updateTime);
  player.addEventListener('ended',() => { paintPlayback(); status('La canción terminó. ¿Es la que estabas pensando?'); });
  player.addEventListener('error',() => { if (player.getAttribute('src')) { paintPlayback(); status('No se pudo cargar la canción. Revisa la ruta del audio en canciones.js.'); } });
  window.addEventListener('pagehide',stopAudio);
  try { validate(); showCover(); }
  catch (error) { app.innerHTML = `<section class="feedback"><h1>Nos falta afinar un detalle.</h1><p>${escape(error.message)}</p><p>Abre canciones.js para corregirlo y vuelve a cargar esta página.</p></section>`; }
})();
