/* ============================================================
   H2K 상반기 결산 타운홀 데크 · 인터랙션
   - 상단 탭 클릭 시 슬라이드 스크롤
   - 발표 모드 (← → · space · esc)
   ============================================================ */

(() => {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const tabs = Array.from(document.querySelectorAll('.nav-tab'));
  const btnPresent = document.getElementById('btn-present');
  const body = document.body;

  let currentIdx = 0;

  // ==== 탭 클릭 → 스크롤 ====
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const slideNum = parseInt(tab.dataset.slide, 10);
      const target = document.getElementById(`s${slideNum}`);
      if (target) {
        if (body.classList.contains('present')) {
          setActiveSlide(slideNum - 1);
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // ==== 발표 모드 토글 ====
  btnPresent.addEventListener('click', () => togglePresent());

  function togglePresent() {
    body.classList.toggle('present');
    if (body.classList.contains('present')) {
      setActiveSlide(currentIdx);
      requestFullscreen();
    } else {
      exitFullscreen();
      slides.forEach(s => s.classList.remove('active'));
    }
  }

  function requestFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }
  function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }

  function setActiveSlide(idx) {
    if (idx < 0) idx = 0;
    if (idx >= slides.length) idx = slides.length - 1;
    currentIdx = idx;
    slides.forEach((s, i) => {
      if (i === idx) s.classList.add('active');
      else s.classList.remove('active');
    });
    updateTopnavActive(idx);
  }

  function updateTopnavActive(idx) {
    // 슬라이드 번호 1-based
    const slideNum = idx + 1;
    let bestTab = null;
    let bestDiff = Infinity;
    tabs.forEach(tab => {
      const t = parseInt(tab.dataset.slide, 10);
      if (t <= slideNum && slideNum - t < bestDiff) {
        bestDiff = slideNum - t;
        bestTab = tab;
      }
    });
    tabs.forEach(t => t.classList.remove('active'));
    if (bestTab) bestTab.classList.add('active');
  }

  // ==== 스크롤 시 탭 하이라이트 (편집 모드) ====
  const observer = new IntersectionObserver((entries) => {
    if (body.classList.contains('present')) return;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = slides.indexOf(entry.target);
        if (idx >= 0) updateTopnavActive(idx);
      }
    });
  }, { threshold: 0.5 });
  slides.forEach(s => observer.observe(s));

  // ==== 오버뷰 모드 (4면 분할) ====
  function toggleOverview() {
    if (body.classList.contains('present')) return;
    body.classList.toggle('overview-mode');
    if (body.classList.contains('overview-mode')) {
      history.replaceState(null, '', '#overview');
      window.scrollTo({ top: 0 });
    } else {
      history.replaceState(null, '', ' ');
    }
  }
  if (window.location.hash === '#overview') {
    body.classList.add('overview-mode');
  }

  // ==== 재생 중 video 찾기 (문서 내 아무 video나) ====
  function playingVideo() {
    return Array.from(document.querySelectorAll('video')).find(v => !v.paused && !v.ended);
  }

  // 좌우 키로 조작할 video: ① 재생 중 → ② 포커스된 video → ③ 활성 슬라이드에서 보다가 멈춘 video
  function seekTargetVideo() {
    const playing = playingVideo();
    if (playing) return playing;
    const focused = document.activeElement;
    if (focused && focused.tagName === 'VIDEO' && !focused.ended) return focused;
    const scope = body.classList.contains('present') && slides[currentIdx] ? slides[currentIdx] : document;
    return Array.from(scope.querySelectorAll('video')).find(v => {
      if (v.currentTime <= 0 || v.ended) return false;
      const r = v.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    });
  }

  // ==== 키보드 ====
  document.addEventListener('keydown', (e) => {
    // 조작 대상 video 있으면 좌우 = 5초 seek (편집·발표 모드 공통)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const v = seekTargetVideo();
      if (v) {
        e.preventDefault();
        if (e.key === 'ArrowRight') {
          v.currentTime = Math.min(v.duration || v.currentTime + 5, v.currentTime + 5);
        } else {
          v.currentTime = Math.max(0, v.currentTime - 5);
        }
        return;
      }
    }

    if (!body.classList.contains('present')) {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.key === 'p')) {
        e.preventDefault();
        togglePresent();
      }
      if (e.key === 'g' || e.key === 'G') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        toggleOverview();
      }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      setActiveSlide(currentIdx + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      setActiveSlide(currentIdx - 1);
    } else if (e.key === 'Escape') {
      togglePresent();
    } else if (e.key === 'Home') {
      setActiveSlide(0);
    } else if (e.key === 'End') {
      setActiveSlide(slides.length - 1);
    }
  });

  // fullscreen change → present class sync
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && body.classList.contains('present')) {
      body.classList.remove('present');
      slides.forEach(s => s.classList.remove('active'));
    }
  });

  // initial
  updateTopnavActive(0);
})();
