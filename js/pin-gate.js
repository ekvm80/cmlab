/*
 * pin-gate.js
 *
 * 4자리 PIN 게이트. `data-pin-gate` 속성이 붙은 링크를 클릭하면 모달을 띄우고,
 * 올바른 PIN을 입력했을 때만 링크를 연다.
 *
 * 검증 방식: 입력값의 SHA-256 해시를 링크의 data-pin-hash 값과 비교한다.
 *   → PIN 원문이 소스에 남지 않는다.
 *
 * 주의: 정적 페이지의 클라이언트 사이드 게이트이므로 접근 제어가 아니라
 *   가벼운 차단 장치다. 대상 URL을 직접 아는 사람은 우회할 수 있고,
 *   4자리는 전수 대입이 가능하다. 진짜 보호가 필요하면 대상 사이트에서
 *   서버 측 인증을 걸어야 한다.
 *
 * 통과 상태는 sessionStorage에 저장하여 같은 탭 세션 동안만 유지한다.
 */
(function () {
  'use strict';

  var PIN_LENGTH = 4;
  var STORE_PREFIX = 'pinGate:';

  /* 문자열의 SHA-256 해시를 소문자 16진수로 반환 */
  function sha256Hex(text) {
    var bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
      return Array.prototype.map
        .call(new Uint8Array(buf), function (b) {
          return b.toString(16).padStart(2, '0');
        })
        .join('');
    });
  }

  /* 모달 DOM을 한 번만 만들어 재사용한다 */
  var overlay, form, input, errorBox, titleBox, cancelBtn;
  var pending = null; // { hash, url, target }

  function buildModal() {
    overlay = document.createElement('div');
    overlay.className = 'pin-overlay';
    overlay.setAttribute('hidden', '');
    overlay.innerHTML =
      '<div class="pin-modal" role="dialog" aria-modal="true" aria-labelledby="pin-title">' +
      '<h2 class="pin-title" id="pin-title">PIN 입력</h2>' +
      '<p class="pin-sub">이 페이지는 4자리 PIN이 필요합니다.</p>' +
      '<form class="pin-form">' +
      '<input class="pin-input" type="password" inputmode="numeric" pattern="[0-9]*" ' +
      'maxlength="' + PIN_LENGTH + '" autocomplete="off" aria-label="4자리 PIN">' +
      '<p class="pin-error" role="alert" hidden>PIN이 올바르지 않습니다.</p>' +
      '<div class="pin-actions">' +
      '<button type="button" class="pin-btn pin-btn-ghost">취소</button>' +
      '<button type="submit" class="pin-btn">확인</button>' +
      '</div>' +
      '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    form = overlay.querySelector('.pin-form');
    input = overlay.querySelector('.pin-input');
    errorBox = overlay.querySelector('.pin-error');
    titleBox = overlay.querySelector('.pin-title');
    cancelBtn = overlay.querySelector('.pin-btn-ghost');

    form.addEventListener('submit', onSubmit);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hasAttribute('hidden')) closeModal();
    });
    /* 숫자만 입력받는다 */
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
      errorBox.hidden = true;
    });
  }

  function openModal(job) {
    pending = job;
    titleBox.textContent = job.label ? job.label + ' — PIN 입력' : 'PIN 입력';
    input.value = '';
    errorBox.hidden = true;
    overlay.removeAttribute('hidden');
    input.focus();
  }

  function closeModal() {
    overlay.setAttribute('hidden', '');
    pending = null;
  }

  /* 새 탭 열기. 팝업 차단으로 실패하면 현재 탭에서 이동한다. */
  function openTarget(url, target) {
    if (target === '_blank') {
      var win = window.open(url, '_blank', 'noopener');
      if (win) return;
    }
    window.location.href = url;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!pending) return;
    var value = input.value;
    if (value.length !== PIN_LENGTH) {
      errorBox.textContent = PIN_LENGTH + '자리 숫자를 입력하세요.';
      errorBox.hidden = false;
      return;
    }
    var job = pending;
    sha256Hex(value).then(
      function (hex) {
        if (hex === job.hash) {
          try {
            sessionStorage.setItem(STORE_PREFIX + job.hash, '1');
          } catch (err) {
            /* 저장이 막혀 있어도 이번 열기는 진행한다 */
          }
          closeModal();
          openTarget(job.url, job.target);
        } else {
          errorBox.textContent = 'PIN이 올바르지 않습니다.';
          errorBox.hidden = false;
          input.value = '';
          input.focus();
        }
      },
      function () {
        /* crypto.subtle은 보안 컨텍스트(https 또는 localhost)에서만 동작한다 */
        errorBox.textContent =
          'PIN을 확인할 수 없습니다. https 주소로 접속해 주세요.';
        errorBox.hidden = false;
      }
    );
  }

  function unlocked(hash) {
    try {
      return sessionStorage.getItem(STORE_PREFIX + hash) === '1';
    } catch (err) {
      return false;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('[data-pin-gate]');
    if (!links.length) return;
    buildModal();

    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener('click', function (e) {
        var hash = link.getAttribute('data-pin-hash');
        if (!hash || unlocked(hash)) return; // 이미 통과했으면 그대로 진행
        e.preventDefault();
        openModal({
          hash: hash,
          url: link.href,
          target: link.getAttribute('target'),
          label: link.getAttribute('data-pin-label')
        });
      });
    });
  });
})();
