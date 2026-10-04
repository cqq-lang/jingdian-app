
var __safeProxy = new Proxy({}, {
  get: function(t, p) {
    if (p==='addEventListener'||p==='removeEventListener') return function(){};
    if (p==='classList') return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}};
    if (p==='style') return {};
    if (p==='value'||p==='textContent'||p==='innerHTML') return '';
    if (p==='offsetHeight'||p==='scrollTop'||p==='clientHeight'||p==='offsetWidth'||p==='clientWidth') return 0;
    if (p==='querySelector') return function(){return null;};
    if (p==='querySelectorAll') return function(){return [];};
    if (p==='parentElement'||p==='previousElementSibling'||p==='closest'||p==='parentNode') return __safeProxy;
    return undefined;
  },
  set: function(){return true;}
});
var __nativeGetById = document.getElementById.bind(document);
var __nativeQuerySel = document.querySelector.bind(document);
var __origGetById = __nativeGetById;
document.getElementById = function(id){ return __origGetById(id) || __safeProxy; };
var __origQuerySel = __nativeQuerySel;
document.querySelector = function(sel){ return __origQuerySel(sel) || __safeProxy; };

// ===== 页面跳转（多文件应用） =====
var PAGE_MAP = {
  'splash': 'splash.html',
  'login': 'login.html',
  'register': 'register.html',
  'home': 'home.html',
  'search': 'search.html',
  'post-detail': 'post-detail.html',
  'map': 'map.html',
  'msg': 'message.html',
  'mine': 'mine.html',
  'publish': 'publish.html',
  'spot-detail': 'spot-detail.html',
  'place-detail': 'place-detail.html',
  'hot-spots': 'hot-spots.html',
  'album': 'album.html',
  'photo-detail': 'photo-detail.html',
  'photo-detail-tips': 'photo-detail-tips.html',
  'photo-detail-guide': 'photo-detail-guide.html',
  'navigation': 'navigation.html',
  'chat': 'chat.html'
};
// 访问路径记录在 sessionStorage 中，返回时按进来的顺序回退
var NAV_STACK_KEY = 'jingdian_nav_stack';

function currentPageFile() {
  var file = window.location.pathname.split('/').pop();
  return file || 'index.html';
}

function readNavStack() {
  try {
    var raw = sessionStorage.getItem(NAV_STACK_KEY);
    var arr = raw ? JSON.parse(raw) : [];
    return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
  } catch (e) {
    return [];
  }
}

function writeNavStack(stack) {
  try { sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack)); } catch (e) {}
}

// 离开当前页面前，先把当前页面记进返回栈
function rememberCurrentPage() {
  var cur = currentPageFile();
  var stack = readNavStack();
  if (stack[stack.length - 1] !== cur) {
    stack.push(cur);
    writeNavStack(stack);
  }
}

// 按文件名跳转，会自动记录返回栈
function goUrl(url) {
  rememberCurrentPage();
  window.location.href = url;
}

function goPage(pageName) {
  var query = '';
  var qIndex = pageName.indexOf('?');
  if (qIndex >= 0) {
    query = pageName.substring(qIndex);
    pageName = pageName.substring(0, qIndex);
  }
  var filename = PAGE_MAP[pageName] || pageName + '.html';
  goUrl(filename + query);
}

// 同一个返回按钮被绑定了两次时，避免一次点击连退两页
var __lastBackTime = 0;
// fallback：没有任何来源记录时的兜底页面
// targetUrl：需要带着状态标记返回时指定的完整地址（例如 spot-detail.html?open=tips）
function goBack(fallback, targetUrl) {
  var now = Date.now();
  if (now - __lastBackTime < 600) return;
  __lastBackTime = now;

  var cur = currentPageFile();
  var stack = readNavStack();
  if (stack[stack.length - 1] === cur) {
    stack.pop();
  }
  var prev = stack[stack.length - 1];
  writeNavStack(stack);

  if (prev && prev !== cur) {
    var samePage = prev.split('?')[0].split('#')[0] === String(targetUrl || '').split('?')[0].split('#')[0];
    window.location.href = (targetUrl && samePage) ? targetUrl : prev;
    return;
  }
  // 返回栈里没有记录时，再尝试浏览器历史或指定兜底页面
  var ref = document.referrer || '';
  if (!targetUrl && ref.indexOf('http') === 0) {
    window.history.back();
    return;
  }
  if (targetUrl) {
    window.location.href = targetUrl;
    return;
  }
  goPage(fallback || 'home');
}
// ===== 页面跳转结束 =====

  // ===== 视图切换 =====
  const splash = document.getElementById('splash');
  const login = document.getElementById('login');
  const register = document.getElementById('register');
  const home = document.getElementById('home');
  const search = document.getElementById('search');
  const statusBarFixed = document.querySelector('.status-bar-fixed');
  const homeTop = document.querySelector('.home-top');

  // 监听滚动，动态改变状态栏背景色
  home.addEventListener('scroll', () => {
    if (homeTop && statusBarFixed) {
      if (home.scrollTop < homeTop.offsetHeight) {
        statusBarFixed.style.background = '#F6E7D7';
      } else {
        statusBarFixed.style.background = '#F5F2ED';
      }
    }
  });

  // 启动页自动跳转已移到 splash.html 页面内脚本

  // ===== Toast =====
  const toast = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  // ===== 手机号与验证码校验（登录页、注册页共用） =====
  // 手机号为 11 位、1 开头、第二位为 3 到 9
  var PHONE_RE = /^1[3-9]\d{9}$/;
  // 验证码为 6 位数字
  var CODE_RE = /^\d{6}$/;
  // 演示用验证码，接入短信服务后由服务端下发
  var DEMO_CODE = '123456';

  function fieldGroupOf(input) {
    return input && input.closest ? input.closest('.input-group') : null;
  }

  // 在输入框下方给出错误提示，并标红输入框
  function setFieldError(input, msg) {
    var group = fieldGroupOf(input);
    if (!group || !group.classList) return;
    group.classList.add('has-error');
    var tip = group.querySelector('.input-error-text');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'input-error-text';
      group.appendChild(tip);
    }
    tip.textContent = msg;
  }

  function clearFieldError(input) {
    var group = fieldGroupOf(input);
    if (!group || !group.classList) return;
    group.classList.remove('has-error');
    var tip = group.querySelector('.input-error-text');
    if (tip) tip.textContent = '';
  }

  // 用户重新输入时清除该输入框的错误状态
  function bindFieldClear(input) {
    if (!input || !input.addEventListener) return;
    input.addEventListener('input', function () { clearFieldError(input); });
  }

  function setAgreementError(on) {
    var box = document.querySelector('.agreement');
    if (box && box.classList) box.classList.toggle('error', !!on);
  }

  // 获取验证码：先校验手机号，再进入 60 秒倒计时
  function bindCodeButton(btn, input, state) {
    if (!btn || !btn.addEventListener) return;
    var left = 0;
    var timer = null;
    btn.addEventListener('click', function () {
      var phone = input.value.trim();
      clearFieldError(input);
      if (!PHONE_RE.test(phone)) {
        setFieldError(input, '请输入 11 位手机号');
        showToast('请输入正确的手机号');
        return;
      }
      if (left > 0) return;
      state.sent = true;
      state.phone = phone;
      showToast('验证码已发送，演示验证码 ' + DEMO_CODE);
      left = 60;
      btn.disabled = true;
      btn.textContent = left + 's后重发';
      timer = setInterval(function () {
        left--;
        if (left <= 0) {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = '获取验证码';
        } else {
          btn.textContent = left + 's后重发';
        }
      }, 1000);
    });
  }

  // 提交前的整体校验：手机号、验证码、协议勾选
  function validateAccountForm(phoneInput, codeInput, agreeCheck, state) {
    var phone = phoneInput.value.trim();
    var code = codeInput.value.trim();
    clearFieldError(phoneInput);
    clearFieldError(codeInput);

    if (!PHONE_RE.test(phone)) {
      var phoneMsg = phone ? '手机号格式不正确' : '请输入手机号';
      setFieldError(phoneInput, phoneMsg);
      showToast(phoneMsg);
      return false;
    }
    if (!state.sent || state.phone !== phone) {
      setFieldError(codeInput, '请先获取验证码');
      showToast('请先获取验证码');
      return false;
    }
    if (!CODE_RE.test(code)) {
      var codeMsg = code ? '请输入 6 位数字验证码' : '请输入验证码';
      setFieldError(codeInput, codeMsg);
      showToast(codeMsg);
      return false;
    }
    if (code !== DEMO_CODE) {
      setFieldError(codeInput, '验证码不正确');
      showToast('验证码不正确');
      return false;
    }
    if (!agreeCheck.checked) {
      setAgreementError(true);
      showToast('请先阅读并同意用户协议和隐私政策');
      return false;
    }
    setAgreementError(false);
    return true;
  }

  function bindSubmitByEnter(inputs, btn) {
    inputs.forEach(function (input) {
      if (!input || !input.addEventListener) return;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') btn.click();
      });
    });
  }

  // ===== 登录 =====
  var codeBtn = document.getElementById('codeBtn');
  var phoneInput = document.getElementById('phone');
  var codeInput = document.getElementById('code');
  var agreeCheck = document.getElementById('agreeCheck');
  var loginBtn = document.getElementById('loginBtn');
  var loginState = { sent: false, phone: '' };

  bindFieldClear(phoneInput);
  bindFieldClear(codeInput);
  bindCodeButton(codeBtn, phoneInput, loginState);

  if (agreeCheck && agreeCheck.addEventListener) {
    agreeCheck.addEventListener('change', function () {
      if (agreeCheck.checked) setAgreementError(false);
    });
  }

  loginBtn.addEventListener('click', function () {
    if (!validateAccountForm(phoneInput, codeInput, agreeCheck, loginState)) return;
    showToast('登录成功');
    setTimeout(function () { goPage('home'); }, 600);
  });
  bindSubmitByEnter([phoneInput, codeInput], loginBtn);

  // ===== 登录 ↔ 注册 切换 =====
  document.getElementById('registerLink').addEventListener('click', () => { goPage('register'); });
  document.getElementById('loginLink').addEventListener('click', () => { goPage('login'); });

  // ===== 注册 =====
  var regCodeBtn = document.getElementById('reg-code-btn');
  var regPhoneInput = document.getElementById('reg-phone');
  var regCodeInput = document.getElementById('reg-code');
  var regAgreeCheck = document.getElementById('reg-agree');
  var regBtn = document.getElementById('reg-btn');
  var regState = { sent: false, phone: '' };

  bindFieldClear(regPhoneInput);
  bindFieldClear(regCodeInput);
  bindCodeButton(regCodeBtn, regPhoneInput, regState);

  if (regAgreeCheck && regAgreeCheck.addEventListener) {
    regAgreeCheck.addEventListener('change', function () {
      if (regAgreeCheck.checked) setAgreementError(false);
    });
  }

  regBtn.addEventListener('click', function () {
    if (!validateAccountForm(regPhoneInput, regCodeInput, regAgreeCheck, regState)) return;
    showToast('注册成功');
    setTimeout(function () { goPage('home'); }, 600);
  });
  bindSubmitByEnter([regPhoneInput, regCodeInput], regBtn);

  // ===== 第三方登录（登录页 + 注册页） =====
  function bindSocialLogin(btnId, platform) {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', () => showToast('演示页面，暂不支持' + platform + '登录'));
  }
  bindSocialLogin('wechatBtn', '微信');
  bindSocialLogin('qqBtn', 'QQ');
  bindSocialLogin('appleBtn', 'Apple');
  bindSocialLogin('reg-wechat-btn', '微信');
  bindSocialLogin('reg-qq-btn', 'QQ');
  bindSocialLogin('reg-apple-btn', 'Apple');

  // ===== 协议链接 =====
  function bindAgreement(linkId) {
    const link = document.getElementById(linkId);
    if (link) link.addEventListener('click', (e) => { e.preventDefault(); showToast('演示页面'); });
  }
  bindAgreement('userAgreement');
  bindAgreement('privacyPolicy');
  bindAgreement('reg-user-agreement');
  bindAgreement('reg-privacy-policy');

  // ===== 广场页：主标签切换（同步两个标签栏） =====
  const mainTabs = document.querySelectorAll('.main-tab');
  mainTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 找到当前点击的标签在其所在.main-tabs中的索引
      var parentMainTabs = tab.parentElement;
      var allMainTabsInParent = parentMainTabs.querySelectorAll('.main-tab');
      var tabIndex = Array.prototype.indexOf.call(allMainTabsInParent, tab);

      // 移除所有.main-tab的active类
      mainTabs.forEach(t => t.classList.remove('active'));

      // 给所有.main-tabs中相同索引的标签添加active类
      var mainTabGroups = document.querySelectorAll('.main-tabs');
      mainTabGroups.forEach(function(group) {
        var tabs = group.querySelectorAll('.main-tab');
        if (tabs[tabIndex]) tabs[tabIndex].classList.add('active');
      });
    });
  });

  // ===== 广场页：子标签切换（同步两个标签栏） =====
  const subTabs = document.querySelectorAll('.sub-tab:not(.sub-tab-more)');
  const subTabsContainers = document.querySelectorAll('.sub-tabs');
  subTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 找到当前点击的标签在其所在.sub-tabs中的索引
      var parentSubTabs = tab.parentElement;
      var allSubTabsInParent = parentSubTabs.querySelectorAll('.sub-tab');
      var tabIndex = Array.prototype.indexOf.call(allSubTabsInParent, tab);

      // 移除所有.sub-tab的active类
      subTabs.forEach(t => t.classList.remove('active'));

      // 给所有.sub-tabs中相同索引的标签添加active类，并同步滚动位置
      subTabsContainers.forEach(function(container) {
        var tabs = container.querySelectorAll('.sub-tab');
        if (tabs[tabIndex]) {
          tabs[tabIndex].classList.add('active');
          // 平滑滚动到中间
          var targetLeft = tabs[tabIndex].offsetLeft - (container.clientWidth / 2) + (tabs[tabIndex].offsetWidth / 2);
          var maxScroll = container.scrollWidth - container.clientWidth;
          var scrollLeft = Math.max(0, Math.min(targetLeft, maxScroll));
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
      });

      // 同步取消下拉面板中的选中
      categoryItems.forEach(i => i.classList.remove('active'));
    });
  });

  // 分类下拉面板
  const subTabMoreButtons = document.querySelectorAll('.sub-tab-more');
  const subTabMore = subTabMoreButtons[0] || document.querySelector('.sub-tab-more');
  const categoryDropdown = document.querySelector('.category-dropdown');
  const dropdownClose = document.querySelector('.dropdown-close');
  const categoryItems = document.querySelectorAll('.category-item');
  const dropdownOverlay = document.querySelector('.dropdown-overlay');

  function getVisibleSubTabMore() {
    return Array.from(subTabMoreButtons).find(button => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }) || subTabMore;
  }

  function setSubTabMoreActive(active) {
    subTabMoreButtons.forEach(button => button.classList.toggle('active', active));
  }

  function alignCategoryDropdown(trigger) {
    const phone = document.querySelector('.phone');
    const target = trigger || getVisibleSubTabMore();
    if (!phone || !target) return;
    const phoneRect = phone.getBoundingClientRect();
    const triggerRect = target.getBoundingClientRect();
    const top = triggerRect.top - phoneRect.top - phone.clientTop;
    categoryDropdown.style.top = Math.max(0, top) + 'px';
  }

  subTabMoreButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShow = categoryDropdown.classList.toggle('show');
      setSubTabMoreActive(isShow);
      dropdownOverlay.classList.toggle('show', isShow);
      if (isShow) {
        alignCategoryDropdown(button);
        home.style.overflow = 'hidden';
      } else {
        home.style.overflow = '';
      }
    });
  });

  dropdownClose.addEventListener('click', (e) => {
    e.stopPropagation();
    categoryDropdown.classList.remove('show');
    setSubTabMoreActive(false);
    dropdownOverlay.classList.remove('show');
    home.style.overflow = '';
  });

  // 点击遮罩层收起弹窗
  dropdownOverlay.addEventListener('click', () => {
    categoryDropdown.classList.remove('show');
    setSubTabMoreActive(false);
    dropdownOverlay.classList.remove('show');
    home.style.overflow = '';
  });

  categoryDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  categoryItems.forEach(item => {
    item.addEventListener('click', () => {
      categoryItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      // 同步到子标签栏
      const tabText = item.textContent.trim();
      let found = false;
      subTabs.forEach(tab => {
        if (tab.textContent.trim() === tabText) {
          subTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          found = true;
        }
      });
      if (!found) {
        subTabs.forEach(t => t.classList.remove('active'));
      }
      categoryDropdown.classList.remove('show');
      setSubTabMoreActive(false);
      dropdownOverlay.classList.remove('show');
      home.style.overflow = '';
    });
  });

  // ===== 广场页：吸顶时显示搜索按钮 =====
  const homeEl = document.getElementById('home');
  const stickyTabs = document.querySelector('.sticky-tabs');
  if (homeEl && stickyTabs) {
    const stickyTop = stickyTabs.offsetTop;
    homeEl.addEventListener('scroll', () => {
      if (homeEl.scrollTop >= stickyTop) {
        stickyTabs.classList.add('is-stuck');
      } else {
        stickyTabs.classList.remove('is-stuck');
      }
    });
  }

  // 搜索页跳转
  const homeSearchBar = document.querySelector('.search-bar');
  const tabSearch = document.querySelector('.tab-search');
  const searchBack = document.querySelector('.search-back');
  const bottomNav = document.querySelector('.bottom-nav');
  const keyboardPopup = document.querySelector('.keyboard-popup');
  const searchInputFull = document.querySelector('.search-input-full');
  
  function goToSearch() { goPage('search'); }

  function backToHome() { goPage('home'); }
  
  if (homeSearchBar) {
    homeSearchBar.addEventListener('click', goToSearch);
  }
  if (tabSearch) {
    tabSearch.addEventListener('click', goToSearch);
  }
  // 点击搜索框弹出键盘
  if (searchInputFull) {
    searchInputFull.addEventListener('click', (e) => {
      e.stopPropagation();
      if (keyboardPopup) keyboardPopup.classList.add('show');
    });
  }
  // 点击搜索页面其他地方收起键盘
  if (search) {
    search.addEventListener('click', (e) => {
      if (!e.target.closest('.search-input-wrap') && !e.target.closest('.keyboard-popup')) {
        if (keyboardPopup) keyboardPopup.classList.remove('show');
      }
    });
  }

  // ===== 帖子详情页 =====
  const postDetail = document.getElementById('post-detail');
  const detailBack = document.querySelector('.detail-back');
  const postCards = document.querySelectorAll('.post-card');
  
  // 点击帖子卡片跳转到详情页
  postCards.forEach(card => {
    card.addEventListener('click', () => { goPage('post-detail'); });
  });
  
  // 点击返回回到进入本页之前的页面
  if (detailBack) {
    detailBack.addEventListener('click', () => { goBack('home'); });
  }
  
  // 图片轮播
  const swiperImages = document.querySelector('.swiper-images');
  const swiperImgs = document.querySelectorAll('.swiper-img');
  const swiperCounter = document.querySelector('.swiper-counter');
  const progressSegments = document.querySelectorAll('.progress-segment');
  let currentSlide = 0;
  const totalSlides = swiperImgs.length;
  
  function updateSwiper() {
    if (swiperImages) {
      swiperImages.style.transition = 'transform 0.3s ease';
      swiperImages.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    if (swiperCounter) {
      swiperCounter.textContent = `${currentSlide + 1}/${totalSlides}`;
    }
    progressSegments.forEach((seg, index) => {
      seg.classList.toggle('active', index === currentSlide);
    });
  }
  
  // 点击左边区域 → 上一张（第一张时固定，不能再往回跳）
  const swiperClickLeft = document.querySelector('.swiper-click-left');
  if (swiperClickLeft) {
    swiperClickLeft.addEventListener('click', () => {
      if (!swiperMoved && currentSlide > 0) {
        currentSlide = currentSlide - 1;
        updateSwiper();
      }
    });
  }
  
  // 点击右边区域 → 下一张（最后一张时固定，不能再往前跳）
  const swiperClickRight = document.querySelector('.swiper-click-right');
  if (swiperClickRight) {
    swiperClickRight.addEventListener('click', () => {
      if (!swiperMoved && currentSlide < totalSlides - 1) {
        currentSlide = currentSlide + 1;
        updateSwiper();
      }
    });
  }
  
  // 点击进度条分段跳转
  progressSegments.forEach((seg, index) => {
    seg.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!swiperMoved) { currentSlide = index; updateSwiper(); }
    });
  });

  
  // 帖子详情页图片滑动（跟手 + 边界阻尼）
  const detailSwiper = document.querySelector('.detail-swiper');
  let swiperMoved = false;
  let dragStartX = 0, dragCurrentX = 0, swiperDragging = false, swiperDragWidth = 0;
  function swiperDragStart(x) {
    dragStartX = x;
    dragCurrentX = x;
    swiperDragging = true;
    swiperMoved = false;
    swiperDragWidth = detailSwiper.offsetWidth;
    swiperImages.style.transition = 'none';
  }
  function swiperDragMove(x) {
    if (!swiperDragging) return;
    dragCurrentX = x;
    if (Math.abs(dragCurrentX - dragStartX) > 5) swiperMoved = true;
    let delta = dragCurrentX - dragStartX;
    if ((currentSlide === 0 && delta > 0) || (currentSlide === totalSlides - 1 && delta < 0)) {
      delta = 0;
    }
    const base = -currentSlide * swiperDragWidth;
    swiperImages.style.transform = 'translateX(' + (base + delta) + 'px)';
  }
  function swiperDragEnd() {
    if (!swiperDragging) return;
    swiperDragging = false;
    const delta = dragCurrentX - dragStartX;
    const threshold = swiperDragWidth * 0.2;
    if (delta > threshold && currentSlide > 0) {
      currentSlide--;
    } else if (delta < -threshold && currentSlide < totalSlides - 1) {
      currentSlide++;
    }
    updateSwiper();
    setTimeout(() => { swiperMoved = false; }, 50);
  }
  if (detailSwiper) {
    detailSwiper.addEventListener('touchstart', (e) => swiperDragStart(e.touches[0].clientX), { passive: true });
    detailSwiper.addEventListener('touchmove', (e) => swiperDragMove(e.touches[0].clientX), { passive: true });
    detailSwiper.addEventListener('touchend', swiperDragEnd);
    detailSwiper.addEventListener('mousedown', (e) => { e.preventDefault(); swiperDragStart(e.clientX); });
    window.addEventListener('mousemove', (e) => swiperDragMove(e.clientX));
    window.addEventListener('mouseup', swiperDragEnd);
  }

  // 通用横向滚动区域鼠标拖拽功能（优化版）
  function enableDragScroll(element) {
    if (!element) return;
    let isDown = false;
    let startX;
    let scrollLeft;
    let dragMoved = false;
    let velocity = 0;
    let lastX = 0;
    let lastTime = 0;
    let animationId = null;
    
    element.addEventListener('mousedown', (e) => {
      isDown = true;
      dragMoved = false;
      element.classList.add('dragging');
      startX = e.pageX;
      scrollLeft = element.scrollLeft;
      lastX = e.pageX;
      lastTime = Date.now();
      velocity = 0;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 3) dragMoved = true;
      element.scrollLeft = scrollLeft - walk;
      // 计算速度用于惯性滚动
      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 0) {
        velocity = (x - lastX) / dt;
      }
      lastX = x;
      lastTime = now;
    });
    
    document.addEventListener('mouseup', (e) => {
      if (!isDown) return;
      isDown = false;
      element.classList.remove('dragging');
      // 惯性滚动
      if (Math.abs(velocity) > 0.1) {
        let currentVelocity = velocity * 15;
        const friction = 0.95;
        function inertia() {
          if (Math.abs(currentVelocity) < 0.5) return;
          element.scrollLeft -= currentVelocity;
          currentVelocity *= friction;
          animationId = requestAnimationFrame(inertia);
        }
        inertia();
      }
    });
    
    // 拖拽时阻止点击事件
    element.addEventListener('click', (e) => {
      if (dragMoved) {
        e.preventDefault();
        e.stopPropagation();
        dragMoved = false;
      }
    }, true);
  }
  
  // 给金刚区和分类栏启用拖拽滚动
  const jingangEl = document.querySelector('.jingang');
  const subTabsEl = document.querySelector('.sub-tabs');
  enableDragScroll(jingangEl);
  enableDragScroll(subTabsEl);
  
  // 互动按钮切换函数（带localStorage持久化）
  function toggleAction(btn) {
    const isActive = btn.classList.contains('active');
    const countEl = btn.querySelector('.count-num');
    const labelEl = btn.querySelector('.action-label');
    const action = btn.getAttribute('data-action');
    const defaultText = btn.getAttribute('data-text');
    let count = parseInt(btn.getAttribute('data-count'));
    
    // 添加点击动画
    btn.classList.remove('clicked');
    void btn.offsetWidth; // 触发重排，重新播放动画
    btn.classList.add('clicked');
    
    if (isActive) {
      // 取消激活
      btn.classList.remove('active');
      // 有帮助按钮：恢复文字
      if (labelEl && defaultText) {
        labelEl.textContent = defaultText;
      }
      if (countEl) {
        count = count - 1;
        btn.setAttribute('data-count', count);
        countEl.textContent = count;
        // 数字变化动画
        btn.classList.remove('count-up');
        void btn.offsetWidth;
        btn.classList.add('count-up');
      }
    } else {
      // 激活
      btn.classList.add('active');
      // 有帮助按钮：显示数字
      if (labelEl && defaultText) {
        labelEl.textContent = count;
      }
      if (countEl) {
        count = count + 1;
        btn.setAttribute('data-count', count);
        countEl.textContent = count;
        // 数字变化动画
        btn.classList.remove('count-up');
        void btn.offsetWidth;
        btn.classList.add('count-up');
      }
    }
    
    // 保存状态到localStorage
    try {
      sessionStorage.setItem('jingdian_post_action_' + action, !isActive ? 'true' : 'false');
    } catch (e) {}
    
    // 移除动画类
    setTimeout(() => {
      btn.classList.remove('clicked');
      btn.classList.remove('count-up');
    }, 500);
  }

  // 页面加载时恢复互动按钮状态
  function restorePostActions() {
    const actionBtns = document.querySelectorAll('.bottom-action[data-action]');
    actionBtns.forEach(function(btn) {
      const action = btn.getAttribute('data-action');
      try {
        if (sessionStorage.getItem('jingdian_post_action_' + action) === 'true') {
          btn.classList.add('active');
          const countEl = btn.querySelector('.count-num');
          const labelEl = btn.querySelector('.action-label');
          const defaultText = btn.getAttribute('data-text');
          let count = parseInt(btn.getAttribute('data-count'));
          if (labelEl && defaultText) {
            labelEl.textContent = count;
          }
          if (countEl) {
            count = count + 1;
            btn.setAttribute('data-count', count);
            countEl.textContent = count;
          }
        }
      } catch (e) {}
    });
  }
  if (document.querySelector('.bottom-action')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', restorePostActions);
    } else {
      restorePostActions();
    }
  }
  
  // 展开/收起回复
  const expandReplies = document.querySelectorAll('.expand-replies');
  expandReplies.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.textContent.includes('展开')) {
        btn.textContent = btn.textContent.replace('展开', '收起');
      } else {
        btn.textContent = btn.textContent.replace('收起', '展开');
      }
    });
  });

  // ===== 机位详情页 =====
  const spotDetail = document.getElementById('spot-detail');
  const spotBackBtn = document.getElementById('spotBackBtn');
  const detailRelated = document.querySelector('.detail-related');

  // 从帖子详情页点击机位卡片跳转到机位详情页
  if (detailRelated) {
    detailRelated.addEventListener('click', () => {
      openSpotDetail('post-detail');
    });
  }

  // 机位详情页返回 → 回到来源页面
  let spotDetailFrom = 'post-detail';
  function openSpotDetail(from) {
    spotDetailFrom = from || 'post-detail';
    goPage('spot-detail');
  }

  // 机位详情页返回 → 回到来源页面
  if (spotBackBtn) {
    spotBackBtn.addEventListener('click', () => { goBack('post-detail'); });
  }

  // 拍摄技巧展开按钮（纯装饰，无实际展开效果）
  const spotTipExpand = document.getElementById('spotTipExpand');
  if (spotTipExpand) {
    spotTipExpand.addEventListener('click', () => {
      // 纯装饰按钮，不做展开效果
    });
  }

  // 收藏机位（去掉文字提示，保留切换功能，带localStorage持久化）
  const spotFavoriteBtn = document.getElementById('spotFavoriteBtn');
  if (spotFavoriteBtn) {
    // 页面加载时恢复状态
    try {
      if (sessionStorage.getItem('jingdian_spot_favorite') === 'true') {
        spotFavoriteBtn.classList.add('favorited');
        const txt = spotFavoriteBtn.querySelector('span');
        if (txt) txt.textContent = '已收藏';
      }
    } catch (e) {}
    spotFavoriteBtn.addEventListener('click', () => {
      spotFavoriteBtn.classList.toggle('favorited');
      const txt = spotFavoriteBtn.querySelector('span');
      txt.textContent = spotFavoriteBtn.classList.contains('favorited') ? '已收藏' : '收藏机位';
      try {
        sessionStorage.setItem('jingdian_spot_favorite', spotFavoriteBtn.classList.contains('favorited') ? 'true' : 'false');
      } catch (e) {}
    });
  }

  // 讨论点赞（带localStorage持久化）
  function toggleSpotLike(el) {
    // 给元素添加唯一标识
    if (!el.getAttribute('data-like-id')) {
      const allLikes = document.querySelectorAll('.spot-discussion-like');
      const idx = Array.prototype.indexOf.call(allLikes, el);
      el.setAttribute('data-like-id', 'spot_like_' + idx);
    }
    const likeId = el.getAttribute('data-like-id');
    el.classList.toggle('liked');
    const m = el.textContent.match(/\d+/);
    let n = m ? parseInt(m[0]) : 0;
    n = el.classList.contains('liked') ? n + 1 : n - 1;
    el.textContent = (el.classList.contains('liked') ? '♥ ' : '♡ ') + n;
    try {
      sessionStorage.setItem('jingdian_' + likeId, el.classList.contains('liked') ? 'true' : 'false');
    } catch (e) {}
  }

  // 页面加载时恢复讨论点赞状态
  function restoreSpotLikes() {
    const allLikes = document.querySelectorAll('.spot-discussion-like');
    allLikes.forEach(function(el, idx) {
      const likeId = 'spot_like_' + idx;
      el.setAttribute('data-like-id', likeId);
      try {
        if (sessionStorage.getItem('jingdian_' + likeId) === 'true') {
          el.classList.add('liked');
          const m = el.textContent.match(/\d+/);
          let n = m ? parseInt(m[0]) : 0;
          el.textContent = '♥ ' + (n + 1);
        }
      } catch (e) {}
    });
  }
  if (document.getElementById('spotFavoriteBtn')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', restoreSpotLikes);
    } else {
      restoreSpotLikes();
    }
  }

  // 顶部图片轮播
  let spotSlideIdx = 0;
  let spotHeroInited = false;
  function initSpotHero() {
    if (spotHeroInited) return;
    spotHeroInited = true;
    const imgs = spotDetail.querySelectorAll('.spot-hero-img');
    const segs = spotDetail.querySelectorAll('.spot-hero-seg');
    const count = spotDetail.querySelector('.spot-hero-count');
    const total = imgs.length;
    const track = spotDetail.querySelector('.spot-hero-images');
    const hero = spotDetail.querySelector('.spot-hero');
    function goSpotSlide(i) {
      if (i < 0 || i >= total) return;
      spotSlideIdx = i;
      track.style.transition = 'transform 0.35s ease';
      track.style.transform = 'translateX(-' + (spotSlideIdx * 100) + '%)';
      segs.forEach((s, idx) => s.classList.toggle('active', idx === spotSlideIdx));
      if (count) count.textContent = '相册 ' + (spotSlideIdx + 1) + '/' + total;
    }
    let moved = false;
    spotDetail.querySelector('.spot-hero-click-left').addEventListener('click', () => { if (!moved && spotSlideIdx > 0) goSpotSlide(spotSlideIdx - 1); });
    spotDetail.querySelector('.spot-hero-click-right').addEventListener('click', () => { if (!moved && spotSlideIdx < total - 1) goSpotSlide(spotSlideIdx + 1); });

    // 触摸/鼠标滑动
    let startX = 0, currentX = 0, isDragging = false, dragWidth = 0;
    function onStart(x) {
      startX = x;
      currentX = x;
      isDragging = true;
      moved = false;
      dragWidth = hero.offsetWidth;
      track.style.transition = 'none';
    }
    function onMove(x) {
      if (!isDragging) return;
      currentX = x;
      if (Math.abs(currentX - startX) > 5) moved = true;
      let delta = currentX - startX;
      // 边界橡皮筋效果
      if (spotSlideIdx === 0 && delta > 0) delta = delta * 0.35;
      if (spotSlideIdx === total - 1 && delta < 0) delta = delta * 0.35;
      const base = -spotSlideIdx * dragWidth;
      track.style.transform = 'translateX(' + (base + delta) + 'px)';
    }
    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      const delta = currentX - startX;
      const threshold = dragWidth * 0.2;
      if (delta > threshold && spotSlideIdx > 0) {
        goSpotSlide(spotSlideIdx - 1);
      } else if (delta < -threshold && spotSlideIdx < total - 1) {
        goSpotSlide(spotSlideIdx + 1);
      } else {
        goSpotSlide(spotSlideIdx);
      }
      setTimeout(() => { moved = false; }, 50);
    }
    hero.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
    hero.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
    hero.addEventListener('touchend', onEnd);
    hero.addEventListener('mousedown', (e) => { e.preventDefault(); onStart(e.clientX); });
    window.addEventListener('mousemove', (e) => onMove(e.clientX));
    window.addEventListener('mouseup', onEnd);
  }

  // ===== 地点详情页 =====
  const placeDetail = document.getElementById('place-detail');
  const placeBackBtn = document.getElementById('placeBackBtn');

  // 从帖子详情页点击定位标签跳转到地点详情页
  const detailLocation = document.querySelector('.detail-location');
  if (detailLocation) {
    detailLocation.style.cursor = 'pointer';
    detailLocation.addEventListener('click', () => { goPage('place-detail'); });
  }


  // Tab切换
  document.querySelectorAll('.place-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.place-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-place-tab');
      document.getElementById('placeNotes').style.display = target === 'notes' ? 'grid' : 'none';
      document.getElementById('placeAround').style.display = target === 'around' ? 'block' : 'none';
    });
  });

  // 地点页图片横向滚动
  let placeGalleryIdx = 0;
  const placeGalleryImages = document.getElementById('placeGalleryImages');
  if (placeGalleryImages) {
    let startX = 0;
    placeGalleryImages.parentElement.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });
    placeGalleryImages.parentElement.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 30) {
        placeGalleryIdx = dx < 0 ? Math.min(placeGalleryIdx + 1, 2) : Math.max(placeGalleryIdx - 1, 0);
        placeGalleryImages.style.transform = 'translateX(-' + (placeGalleryIdx * 33.333) + '%)';
      }
    });
  }

  // ============================================================

  // ============================================================
  // 轻量地图引擎（零第三方依赖：瓦片加载 / 拖拽惯性 / 缩放 / 飞行定位）
  // ============================================================
  const MAP_BOUNDS = { minLat: 30.08, maxLat: 30.36, minLng: 120.02, maxLng: 120.30 };
  const TILE = 256;

  class SlippyMap {
    constructor(el, opts) {
      this.el = el;
      this.center = { lat: opts.center[0], lng: opts.center[1] };
      this.zoom = opts.zoom;
      this.minZoom = opts.minZoom || 10;
      this.maxZoom = opts.maxZoom || 18;
      this.onZoomEnd = opts.onZoomEnd || null;
      this.onMarkerClick = opts.onMarkerClick || null;

      this.W = el.clientWidth;
      this.H = el.clientHeight;

      this.tileLayer = document.createElement('div');
      this.tileLayer.className = 'slippy-tiles';
      this.markerLayer = document.createElement('div');
      this.markerLayer.className = 'slippy-markers';
      this.attr = document.createElement('div');
      this.attr.className = 'slippy-attr';
      this.attr.textContent = '© OpenStreetMap contributors';
      el.append(this.tileLayer, this.markerLayer, this.attr);

      this.tiles = new Map();
      this.markers = [];
      this.dots = [];

      this.dragging = false;
      this.dragMoved = false;
      this.lastX = 0;
      this.lastY = 0;
      this.velX = 0;
      this.velY = 0;
      this.anim = null;
      this.pointers = new Map();
      this.pinchDist = 0;
      this.pinchZoom = 0;

      this.tileSource = 0;   // 0=OSM  1=高德
      this.tileErrors = 0;

      this._bindEvents();
      this.setView(this.center, this.zoom, 0);
    }

    // ---------- 坐标换算 ----------
    project(lat, lng, z) {
      const s = Math.pow(2, z) * TILE;
      const x = (lng + 180) / 360 * s;
      const latR = lat * Math.PI / 180;
      const y = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * s;
      return { x: x, y: y };
    }
    unproject(x, y, z) {
      const s = Math.pow(2, z) * TILE;
      const lng = x / s * 360 - 180;
      const n = Math.PI - 2 * Math.PI * y / s;
      const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
      return { lat: lat, lng: lng };
    }
    origin() {
      const w = this.project(this.center.lat, this.center.lng, this.zoom);
      return { x: w.x - this.W / 2, y: w.y - this.H / 2 };
    }
    clampCenter(lat, lng) {
      return {
        lat: Math.max(MAP_BOUNDS.minLat, Math.min(MAP_BOUNDS.maxLat, lat)),
        lng: Math.max(MAP_BOUNDS.minLng, Math.min(MAP_BOUNDS.maxLng, lng))
      };
    }

    // ---------- 视图 ----------
    _applyView(center, zoom, fire) {
      const c = this.clampCenter(center.lat, center.lng);
      this.center = c;
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
      this.renderTiles();
      this.renderPins();
      if (fire && this.onZoomEnd) this.onZoomEnd(Math.round(this.zoom));
    }
    setView(center, zoom, duration) {
      const self = this;
      if (duration) {
        const from = { lat: this.center.lat, lng: this.center.lng, z: this.zoom };
        const to = { lat: (Array.isArray(center) ? center[0] : center.lat), lng: (Array.isArray(center) ? center[1] : center.lng), z: zoom };
        const t0 = performance.now();
        if (this.anim) cancelAnimationFrame(this.anim);
        const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const step = (now) => {
          let t = Math.min(1, (now - t0) / duration);
          t = ease(t);
          this._applyView(
            { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t },
            from.z + (to.z - from.z) * t,
            t >= 1
          );
          if (t < 1) this.anim = requestAnimationFrame(step);
        };
        this.anim = requestAnimationFrame(step);
      } else {
        this._applyView({ lat: (Array.isArray(center) ? center[0] : center.lat), lng: (Array.isArray(center) ? center[1] : center.lng) }, zoom, true);
      }
    }
    flyTo(latlng, zoom, duration) {
      this.setView(latlng, zoom, duration || 700);
    }
    zoomIn() { this.setView([this.center.lat, this.center.lng], this.zoom + 1, 250); }
    zoomOut() { this.setView([this.center.lat, this.center.lng], this.zoom - 1, 250); }
    getZoom() { return this.zoom; }

    // ---------- 瓦片 ----------
    _tileURL(z, x, y) {
      if (this.tileSource === 0) {
        return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
      }
      const s = '1234'[(x + y) % 4];
      return 'https://webrd' + s + '.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=' + x + '&y=' + y + '&z=' + z;
    }
    switchSource(src) {
      this.tileSource = src;
      this.tiles.forEach((img, key) => {
        const p = key.split('/');
        img.src = this._tileURL(+p[0], +p[1], +p[2]);
        img.style.opacity = '';
      });
      this.attr.textContent = src === 0 ? '© OpenStreetMap contributors' : '© 高德地图';
    }
    _tileError(img) {
      if (this.tileSource === 0) {
        this.tileErrors++;
        if (this.tileErrors >= 6) this.switchSource(1);
      } else {
        this.tileErrors++;
        if (this.tileErrors >= 40) {
          img.style.visibility = 'hidden';
          const hint = document.getElementById('mapTileHint');
          if (hint) hint.classList.add('show');
        }
      }
    }
    renderTiles() {
      const z = Math.round(this.zoom);
      const o = this.origin();
      const x0 = Math.floor(o.x / TILE);
      const x1 = Math.floor((o.x + this.W) / TILE);
      const y0 = Math.floor(o.y / TILE);
      const y1 = Math.floor((o.y + this.H) / TILE);
      const n = Math.pow(2, z);
      const need = {};
      for (let x = Math.max(0, x0); x <= Math.min(n - 1, x1); x++) {
        for (let y = Math.max(0, y0); y <= Math.min(n - 1, y1); y++) {
          const key = z + '/' + x + '/' + y;
          need[key] = 1;
          let img = this.tiles.get(key);
          if (!img) {
            img = document.createElement('img');
            img.className = 'slippy-tile';
            img.draggable = false;
            img.alt = '';
            img.addEventListener('error', () => this._tileError(img));
            this.tiles.set(key, img);
            img.src = this._tileURL(z, x, y);
            this.tileLayer.appendChild(img);
          }
          img.style.transform = 'translate(' + (x * TILE - o.x) + 'px,' + (y * TILE - o.y) + 'px)';
          img.style.display = '';
        }
      }
      this.tiles.forEach((img, key) => {
        if (!need[key]) {
          img.remove();
          this.tiles.delete(key);
        }
      });
    }

    // ---------- 标记 / 定位点 ----------
    addMarker(spot) {
      const wrap = document.createElement('div');
      wrap.className = 'spot-pin-wrap';
      wrap.innerHTML =
        '<div class="spot-pin pop">' +
        '<img class="pin-img" src="assets/map/' + spot.img + '" alt="' + spot.name + '">' +
        '<span class="pin-name">' + spot.name + '</span>' +
        '<div class="pin-dot"></div></div>';
      const self = this;
      wrap.addEventListener('click', () => {
        if (self.onMarkerClick) self.onMarkerClick(spot);
      });
      this.markerLayer.appendChild(wrap);
      const item = { spot: spot, wrap: wrap, el: wrap.querySelector('.spot-pin') };
      this.markers.push(item);
      this.renderPins();
      return item;
    }
    addDot(latlng) {
      if (this.dots.length) this.removeDot();
      const wrap = document.createElement('div');
      wrap.className = 'user-dot-wrap';
      wrap.innerHTML = '<div class="user-dot"></div>';
      this.markerLayer.appendChild(wrap);
      this.dots.push({ lat: latlng[0], lng: latlng[1], wrap: wrap });
      this.renderPins();
      return wrap;
    }
    removeDot() {
      this.dots.forEach(d => d.wrap.remove());
      this.dots = [];
    }
    renderPins() {
      const o = this.origin();
      this.markers.forEach(m => {
        const p = this.project(m.spot.lat, m.spot.lng, this.zoom);
        const x = p.x - o.x;
        const y = p.y - o.y;
        m.wrap.style.transform = 'translate(' + (x - 38) + 'px,' + (y - 100) + 'px)';
        m.wrap.style.display = (x < -140 || x > this.W + 140 || y < -150 || y > this.H + 80) ? 'none' : '';
      });
      this.dots.forEach(d => {
        const p = this.project(d.lat, d.lng, this.zoom);
        const x = p.x - o.x;
        const y = p.y - o.y;
        d.wrap.style.transform = 'translate(' + (x - 8) + 'px,' + (y - 8) + 'px)';
      });
    }

    // ---------- 交互 ----------
    _bindEvents() {
      const self = this;
      this.el.addEventListener('pointerdown', (e) => {
        self.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (self.pointers.size === 1) {
          self.dragging = true;
          self.dragMoved = false;
          self.lastX = e.clientX;
          self.lastY = e.clientY;
          self.velX = 0;
          self.velY = 0;
          if (self.anim) { cancelAnimationFrame(self.anim); self.anim = null; }
        } else if (self.pointers.size === 2) {
          self.dragging = false;
          const pts = Array.from(self.pointers.values());
          self.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          self.pinchZoom = self.zoom;
          const rect = self.el.getBoundingClientRect();
          self.pinchCenter = {
            x: (pts[0].x + pts[1].x) / 2 - rect.left,
            y: (pts[0].y + pts[1].y) / 2 - rect.top
          };
        }
      });
      window.addEventListener('pointermove', (e) => {
        if (!self.pointers.has(e.pointerId)) return;
        self.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (self.pointers.size === 2) {
          const pts = Array.from(self.pointers.values());
          const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          const dz = Math.log2(d / self.pinchDist);
          self._zoomAt(self.pinchCenter, self.pinchZoom + dz);
          return;
        }
        if (!self.dragging) return;
        const dx = e.clientX - self.lastX;
        const dy = e.clientY - self.lastY;
        if (!self.dragMoved && Math.hypot(dx, dy) > 3) self.dragMoved = true;
        self.lastX = e.clientX;
        self.lastY = e.clientY;
        self.velX = dx;
        self.velY = dy;
        self._panBy(-dx, -dy);
      });
      const endDrag = (e) => {
        self.pointers.delete(e.pointerId);
        if (self.pointers.size === 0 && self.dragging) {
          self.dragging = false;
          if (self.dragMoved && (Math.abs(self.velX) > 2 || Math.abs(self.velY) > 2)) {
            self._inertia(self.velX, self.velY);
          }
        }
      };
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      this.el.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = self.el.getBoundingClientRect();
        const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        self._zoomAt(p, self.zoom + (e.deltaY < 0 ? 1 : -1));
      }, { passive: false });
      this.el.addEventListener('dblclick', (e) => {
        const rect = self.el.getBoundingClientRect();
        const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        self._zoomAt(p, self.zoom + 1);
      });
    }
    _panBy(dx, dy) {
      const w = this.project(this.center.lat, this.center.lng, this.zoom);
      const c = this.unproject(w.x + dx, w.y + dy, this.zoom);
      this._applyView(c, this.zoom, false);
    }
    _zoomAt(p, targetZoom) {
      const nz = Math.max(this.minZoom, Math.min(this.maxZoom, targetZoom));
      if (nz === this.zoom) return;
      const scale = Math.pow(2, nz - this.zoom);
      const w = this.project(this.center.lat, this.center.lng, this.zoom);
      const o = { x: w.x - this.W / 2, y: w.y - this.H / 2 };
      const under = { x: (o.x + p.x) * scale - p.x, y: (o.y + p.y) * scale - p.y };
      const c = this.unproject(under.x + this.W / 2, under.y + this.H / 2, nz);
      this._applyView(c, nz, true);
    }
    _inertia(vx, vy) {
      const self = this;
      let vx2 = vx, vy2 = vy;
      const step = () => {
        vx2 *= 0.92;
        vy2 *= 0.92;
        if (Math.abs(vx2) < 0.3 && Math.abs(vy2) < 0.3) return;
        self._panBy(vx2, vy2);
        self.anim = requestAnimationFrame(step);
      };
      self.anim = requestAnimationFrame(step);
    }
  }

  function outOfChina(lat, lng) {
    return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
  }

  function transformLat(x, y) {
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(x, y) {
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  }

  function wgs84ToGcj02(lat, lng) {
    if (outOfChina(lat, lng)) return [lat, lng];
    var a = 6378245.0;
    var ee = 0.00669342162296594323;
    var dLat = transformLat(lng - 105.0, lat - 35.0);
    var dLng = transformLng(lng - 105.0, lat - 35.0);
    var radLat = lat / 180.0 * Math.PI;
    var magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    var sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    return [lat + dLat, lng + dLng];
  }

  var amapLoadPromise = null;
  var POI_FALLBACK_IMG = 'assets/map/jixian.jpg';

  function setImageWithFallback(img, url) {
    if (!img) return;
    img.onerror = function() {
      img.onerror = null;
      img.src = POI_FALLBACK_IMG;
    };
    img.src = url || POI_FALLBACK_IMG;
  }

  function loadAmap() {
    document.getElementById = __nativeGetById;
    document.querySelector = __nativeQuerySel;
    if (window.AMap) return Promise.resolve(window.AMap);
    if (amapLoadPromise) return amapLoadPromise;
    var key = window.AMAP_WEB_KEY;
    if (!key) return Promise.reject(new Error('Missing AMap web key'));
    amapLoadPromise = new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(key) + '&plugin=AMap.Geolocation,AMap.PlaceSearch';
      script.onload = function() {
        if (window.AMap) resolve(window.AMap);
        else reject(new Error('AMap did not initialize'));
      };
      script.onerror = function() { reject(new Error('AMap script failed to load')); };
      document.head.appendChild(script);
    });
    return amapLoadPromise;
  }

  class AmapMap {
    constructor(el, opts) {
      this.el = el;
      this.minZoom = opts.minZoom || 10;
      this.maxZoom = opts.maxZoom || 18;
      this.onZoomEnd = opts.onZoomEnd || null;
      this.onMarkerClick = opts.onMarkerClick || null;
      this.onViewportChange = opts.onViewportChange || null;
      this.onViewportMove = opts.onViewportMove || null;
      this.markers = [];
      this.dots = [];
      this.currentZoom = opts.zoom;
      this.visibilityFrame = null;
      this.viewportTimer = null;
      this.liveViewportTimer = null;
      this.lastLiveView = null;

      var center = wgs84ToGcj02(opts.center[0], opts.center[1]);
      this.map = new AMap.Map(el, {
        center: [center[1], center[0]],
        zoom: opts.zoom,
        zooms: [this.minZoom, this.maxZoom],
        viewMode: '2D',
        resizeEnable: true,
        mapStyle: 'amap://styles/normal'
      });

      var self = this;
      this.map.on('zoomend', function() {
        self.currentZoom = self.map.getZoom();
        self.updateMarkerVisibility();
        if (self.onZoomEnd) self.onZoomEnd(Math.round(self.currentZoom));
        self.scheduleViewportChange();
      });
      this.map.on('zoomchange', function() {
        self.scheduleMarkerVisibilityUpdate();
        self.scheduleLiveViewportChange();
      });
      this.map.on('mapmove', function() {
        self.scheduleMarkerVisibilityUpdate();
        self.scheduleLiveViewportChange();
      });
      this.map.on('moveend', function() {
        if (self.liveViewportTimer) {
          window.clearTimeout(self.liveViewportTimer);
          self.liveViewportTimer = null;
        }
        self.updateMarkerVisibility();
        self.scheduleViewportChange();
      });
      this.map.on('complete', function() {
        var hint = document.getElementById('mapTileHint');
        if (hint) hint.classList.remove('show');
        self.updateMarkerVisibility();
        self.scheduleViewportChange(0);
      });
    }

    position(latlng, alreadyGcj) {
      var ll = alreadyGcj ? [latlng[0], latlng[1]] : wgs84ToGcj02(latlng[0], latlng[1]);
      return new AMap.LngLat(ll[1], ll[0]);
    }

    setView(center, zoom, duration, alreadyGcj) {
      var targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
      var target = this.position(center, alreadyGcj);
      this.map.setZoomAndCenter(targetZoom, target, false, duration || 0);
      if (this.onZoomEnd) this.onZoomEnd(Math.round(targetZoom));
    }

    flyTo(latlng, zoom, duration, alreadyGcj) {
      this.setView(latlng, zoom, duration || 700, alreadyGcj);
    }

    zoomIn() { this.map.zoomIn(); }
    zoomOut() { this.map.zoomOut(); }
    getZoom() { return this.map.getZoom(); }

    scheduleViewportChange(delay) {
      if (!this.onViewportChange) return;
      if (this.viewportTimer) window.clearTimeout(this.viewportTimer);
      var self = this;
      var wait = typeof delay === 'number' ? delay : 420;
      this.viewportTimer = window.setTimeout(function() {
        self.viewportTimer = null;
        var center = self.map.getCenter();
        var bounds = self.map.getBounds();
        self.onViewportChange({
          center: { lat: center.getLat(), lng: center.getLng() },
          centerLngLat: center,
          bounds: bounds,
          zoom: self.map.getZoom()
        });
      }, wait);
    }

    scheduleLiveViewportChange() {
      if (!this.onViewportMove || this.liveViewportTimer) return;
      var self = this;
      this.liveViewportTimer = window.setTimeout(function() {
        self.liveViewportTimer = null;
        var center = self.map.getCenter();
        var zoom = self.map.getZoom();
        if (self.lastLiveView && Math.abs(self.lastLiveView.zoom - zoom) < 0.01) {
          if (self.lastLiveView.center.distance(center) < 260) return;
        }
        self.lastLiveView = { center: center, zoom: zoom };
        self.onViewportMove({
          center: { lat: center.getLat(), lng: center.getLng() },
          centerLngLat: center,
          bounds: self.map.getBounds(),
          zoom: zoom
        });
      }, 650);
    }

    scheduleMarkerVisibilityUpdate() {
      if (this.visibilityFrame) return;
      var self = this;
      this.visibilityFrame = window.requestAnimationFrame(function() {
        self.visibilityFrame = null;
        self.updateMarkerVisibility();
      });
    }

    updateMarkerVisibility() {
      var zoom = this.map.getZoom();
      var targetVisible = zoom < 12 ? 5 : (zoom < 14.5 ? 6 : 7);

      var width = this.el.clientWidth || 375;
      var height = this.el.clientHeight || 812;
      var safeTop = Math.min(220, Math.max(150, height * 0.22));
      var safeBottom = height - Math.max(100, height * 0.12);
      var edgePadding = 36;
      var allCandidates = [];
      var self = this;

      this.markers.forEach(function(item) {
        if (item.filterVisible === false) return;
        var pos = item.marker.getPosition();
        var pixel = self.map.lngLatToContainer(pos);
        if (!pixel) return;
        var x = pixel.getX ? pixel.getX() : pixel.x;
        var y = pixel.getY ? pixel.getY() : pixel.y;
        if (x < -edgePadding || x > width + edgePadding || y < -edgePadding || y > height + edgePadding) return;

        var dx = x - width / 2;
        var dy = y - height / 2;
        allCandidates.push({
          item: item,
          x: x,
          y: y,
          distance: Math.sqrt(dx * dx + dy * dy),
          major: item.spot.major === true
        });
      });

      var candidates = allCandidates.filter(function(entry) {
        return entry.x >= 42 && entry.x <= width - 42 && entry.y >= safeTop && entry.y <= safeBottom;
      });
      if (candidates.length < Math.min(5, allCandidates.length)) candidates = allCandidates;

      if (!candidates.length) {
        this.markers.forEach(function(item) { item.setVisible(false, false); });
        return;
      }

      candidates.sort(function(a, b) { return a.distance - b.distance; });

      var majorCandidates = candidates.filter(function(entry) { return entry.major; });
      var seed = (majorCandidates.length ? majorCandidates : candidates)[0];
      var selectedEntries = [seed];
      var selectedSet = [seed.item];
      var target = Math.min(targetVisible, candidates.length);

      while (selectedEntries.length < target) {
        var best = null;
        var bestScore = -Infinity;
        candidates.forEach(function(entry) {
          if (selectedSet.indexOf(entry.item) !== -1) return;
          var minDistance = Infinity;
          selectedEntries.forEach(function(selected) {
            var dx = entry.x - selected.x;
            var dy = entry.y - selected.y;
            minDistance = Math.min(minDistance, Math.sqrt(dx * dx + dy * dy));
          });
          var score = minDistance - entry.distance * 0.05;
          if (score > bestScore) {
            bestScore = score;
            best = entry;
          }
        });
        if (!best) break;
        selectedEntries.push(best);
        selectedSet.push(best.item);
      }

      var selectedItems = selectedEntries.map(function(entry) {
        return entry.item;
      });

      var enteringIndex = 0;
      this.markers.forEach(function(item) {
        var shouldShow = selectedItems.indexOf(item) !== -1;
        var animate = shouldShow && !item.visible;
        if (animate) {
          item.el.style.animationDelay = Math.min(enteringIndex, 4) * 45 + 'ms';
          enteringIndex++;
        } else if (shouldShow) {
          item.el.style.animationDelay = '0ms';
        }
        item.setVisible(shouldShow, animate);
      });
    }

    addMarker(spot) {
      var wrap = document.createElement('div');
      wrap.className = 'spot-pin-wrap';

      var pin = document.createElement('div');
      pin.className = 'spot-pin pop';

      var img = document.createElement('img');
      img.className = 'pin-img';
      setImageWithFallback(img, spot.imgUrl || (spot.img ? 'assets/map/' + spot.img : ''));
      img.alt = spot.name;

      var name = document.createElement('span');
      name.className = 'pin-name';
      name.textContent = spot.name;

      var dot = document.createElement('div');
      dot.className = 'pin-dot';

      pin.append(img, name, dot);
      wrap.appendChild(pin);

      var pos = wgs84ToGcj02(spot.lat, spot.lng);
      var marker = new AMap.Marker({
        position: [pos[1], pos[0]],
        content: wrap,
        offset: new AMap.Pixel(-44, -125),
        zIndex: 220,
        clickable: true
      });
      marker.setMap(this.map);

      var owner = this;
      marker.on('click', function() {
        if (owner.onMarkerClick) owner.onMarkerClick(spot);
      });

      var item = {
        spot: spot,
        wrap: wrap,
        el: pin,
        marker: marker,
        visible: null,
        filterVisible: true
      };
      item.setVisible = function(visible, animate) {
        if (item.visible === visible) return;
        if (visible) {
          marker.show();
          pin.classList.remove('card-hidden');
          if (animate) {
            pin.classList.remove('card-enter');
            void pin.offsetWidth;
            pin.classList.add('card-enter');
          }
        } else {
          marker.hide();
          pin.classList.add('card-hidden');
        }
        item.visible = visible;
      };
      item.setFilterVisible = function(visible) {
        item.filterVisible = visible;
        owner.updateMarkerVisibility();
      };
      this.markers.push(item);
      return item;
    }

    addDot(latlng, alreadyGcj) {
      this.removeDot();
      var pos = this.position(latlng, alreadyGcj);
      var wrap = document.createElement('div');
      wrap.className = 'user-location-wrap';
      wrap.innerHTML =
        '<div class="user-location-pulse"></div>' +
        '<img class="user-location-avatar" src="assets/diandian.png" alt="">' +
        '<div class="user-location-arrow"></div>';
      var marker = new AMap.Marker({
        position: pos,
        content: wrap,
        offset: new AMap.Pixel(-19, -43),
        zIndex: 800,
        clickable: false
      });
      marker.setMap(this.map);
      this.dots.push({ marker: marker, wrap: wrap });
      return marker;
    }

    removeDot() {
      this.dots.forEach(function(dot) {
        if (dot.marker) dot.marker.setMap(null);
        else if (dot.setMap) dot.setMap(null);
        if (dot.wrap && dot.wrap.parentNode) dot.wrap.parentNode.removeChild(dot.wrap);
      });
      this.dots = [];
    }

    clearMarkers() {
      this.markers.forEach(function(item) {
        if (item.marker) item.marker.setMap(null);
        if (item.wrap && item.wrap.parentNode) item.wrap.parentNode.removeChild(item.wrap);
      });
      this.markers = [];
    }
  }

  // ============================================================
  // 机位数据（地图页）
  // ============================================================
  const SPOTS = [
    { id:'duanqiao', name:'断桥残雪', cat:'湖景', lat:30.2593, lng:120.1519, dist:'1.2', fee:'免费', img:'duanqiao.jpg',
      desc:'白堤东端的石拱桥，雪后桥面覆雪、远山如黛，是拍摄宝石山与北山街全景的经典前景。',
      best:'冬季雪后清晨 / 日出前后', tip:'用中长焦压缩湖面与山体，雪后清晨桥面人最少。' },
    { id:'jixian', name:'集贤亭', cat:'湖景', lat:30.2488, lng:120.1557, dist:'0.1', fee:'免费', img:'jixian.jpg',
      desc:'湖滨一公园伸入湖中的六角亭，日落时亭、湖、远山同框，倒影清晰。',
      best:'日落前 1 小时', tip:'黄金时刻水面反光最暖，低机位拍亭子完整倒影。' },
    { id:'changqiao', name:'长桥公园', cat:'湖景', lat:30.2299, lng:120.1504, dist:'2.2', fee:'免费', img:'changqiao.jpg',
      desc:'南山路边观景位，雷峰塔倒影与夕阳同框的经典机位。',
      best:'日落时分', tip:'“长桥不长情意长”，中焦收塔身与倒影同框。' },
    { id:'quyuan', name:'曲院风荷', cat:'园林', lat:30.2520, lng:120.1308, dist:'2.4', fee:'免费', img:'quyuan.jpg',
      desc:'夏日荷塘与亭廊结合，清晨薄雾时荷叶荷花最出片。',
      best:'6–7 月清晨', tip:'大光圈虚化前景荷叶，用亭廊作背景层次。' },
    { id:'maojiabu', name:'茅家埠', cat:'园林', lat:30.2405, lng:120.1215, dist:'3.4', fee:'免费', img:'maojiabu.jpg',
      desc:'西湖西岸湿地，秋冬芦苇与水面雾气交叠，充满自然野趣。',
      best:'秋冬清晨', tip:'逆光芦苇最通透，建议带 70-200mm 长焦。' },
    { id:'xiaoxialong', name:'晓霞弄·望仙阁', cat:'街巷', lat:30.2360, lng:120.1665, dist:'1.8', fee:'免费', img:'xiaoxialong.jpg',
      desc:'吴山脚下老巷，巷口可框望仙阁古建，蓝调时刻氛围感拉满。',
      best:'傍晚蓝调时刻', tip:'用巷子两侧墙体做引导线，等一盏路灯亮起。' },
    { id:'beishan', name:'北山街', cat:'街巷', lat:30.2558, lng:120.1408, dist:'1.6', fee:'免费', img:'beishan.jpg',
      desc:'西湖边的民国老街，深秋梧桐金黄，清晨车流稀少、光影柔和。',
      best:'深秋清晨', tip:'顺光拍建筑细节，逆光拍梧桐剪影。' },
    { id:'baochu', name:'宝石山·保俶塔', cat:'山景', lat:30.2587, lng:120.1448, dist:'1.5', fee:'免费', img:'baochu.jpg',
      desc:'登顶俯瞰西湖全景，保俶塔与城市天际线同框，视野极佳。',
      best:'日出 / 黄昏', tip:'上山约 20 分钟，带广角拍大场景。' },
    { id:'leifeng', name:'雷峰塔', cat:'古建', lat:30.2319, lng:120.1488, dist:'2.0', fee:'登塔约40元', img:'leifeng.jpg',
      desc:'夕照山上的千年名塔，傍晚暖光下轮廓层次最清晰。',
      best:'日落前后', tip:'外围免费，塔上可俯瞰西湖与苏堤全景。' },
    { id:'sudi', name:'苏堤', cat:'湖景', lat:30.2445, lng:120.1373, dist:'1.9', fee:'免费', img:'sudi.jpg',
      desc:'六桥起伏穿湖，春日桃柳相映，四季晨昏各有景致。',
      best:'四季清晨', tip:'用桥孔做画框，对称构图拍长堤纵深。' },
    { id:'liulang', name:'柳浪闻莺', cat:'园林', lat:30.2398, lng:120.1553, dist:'1.0', fee:'免费', img:'liulang.jpg',
      desc:'沿湖园林，春柳与樱花夹道，长廊临水、视野开阔。',
      best:'3–4 月', tip:'长廊作引导线伸向湖面，樱花前景虚化。' },
    { id:'yuhuwan', name:'浴鹄湾·霁虹桥', cat:'园林', lat:30.2292, lng:120.1310, dist:'3.3', fee:'免费', img:'yuhuwan.jpg',
      desc:'杨公堤旁的江南园林，霁虹桥廊亭跨水，水面如镜倒影完整。',
      best:'清晨 / 黄昏', tip:'低机位拍桥与倒影的对称构图。' },
    { id:'santan', name:'三潭印月', cat:'湖景', lat:30.2365, lng:120.1453, dist:'1.7', fee:'游船约55元', img:'santan.jpg',
      desc:'湖心岛外三座石塔，需乘船前往，白天碧水蓝天最出片。',
      best:'无风白天', tip:'坐船近岸拍塔与远山层次，无风日倒影最完整。' },
    { id:'yanggongdi', name:'杨公堤', cat:'街巷', lat:30.2460, lng:120.1260, dist:'2.9', fee:'免费', img:'yanggongdi.jpg',
      desc:'与苏堤平行的林荫大道，深秋梧桐光影斑驳，骑行视角最佳。',
      best:'深秋清晨', tip:'侧逆光让树影层次更丰富。' }
  ];

  // ============================================================
  // 地图页
  // ============================================================
  const mapView = document.getElementById('map-view');
  const msgView = document.getElementById('msg-view');
  const mineView = document.getElementById('mine-view');
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');

  let mapObj = null;
  let markers = [];
  let activeSpot = null;
  let currentCat = '全部';
  let currentQuery = '';
  let mapInited = false;
  let poiRequestSeq = 0;
  let poiCache = new Map();
  let userLocation = null;
  let userLocationLoading = false;

  function createPoiSearch() {
    if (!window.AMap || !window.AMap.PlaceSearch) return null;
    return new AMap.PlaceSearch({
      type: '风景名胜|公园广场|博物馆|展览馆',
      pageSize: 20,
      pageIndex: 1,
      extensions: 'all'
    });
  }

  function getPoiCacheKey(view) {
    var precision = view.zoom >= 15 ? 4 : (view.zoom >= 13 ? 3 : 2);
    return view.zoom.toFixed(1) + '|' + view.center.lat.toFixed(precision) + '|' + view.center.lng.toFixed(precision);
  }

  function getSearchCenters(bounds) {
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    var midLat = (sw.lat + ne.lat) / 2;
    var midLng = (sw.lng + ne.lng) / 2;
    return [
      new AMap.LngLat(midLng, midLat),
      new AMap.LngLat(sw.lng + (ne.lng - sw.lng) * 0.25, midLat),
      new AMap.LngLat(sw.lng + (ne.lng - sw.lng) * 0.75, midLat),
      new AMap.LngLat(midLng, sw.lat + (ne.lat - sw.lat) * 0.25),
      new AMap.LngLat(midLng, sw.lat + (ne.lat - sw.lat) * 0.75)
    ];
  }

  function requestNearbyPois(view) {
    if (activeSpot) return;
    if (!view || !view.bounds || !window.AMap || !window.AMap.PlaceSearch) return;

    var cacheKey = getPoiCacheKey(view);
    if (poiCache.has(cacheKey)) {
      renderDynamicPois(poiCache.get(cacheKey), view);
      return;
    }

    var requestId = ++poiRequestSeq;
    var centers = getSearchCenters(view.bounds);
    var radius = view.centerLngLat.distance(view.bounds.getNorthEast());
    radius = Math.min(6000, Math.max(800, Math.round(radius * 0.42)));
    var centerIndex = 0;
    var merged = [];
    var seen = {};
    var successCount = 0;

    function finish() {
      if (requestId !== poiRequestSeq) return;
      if (!successCount) return;
      if (merged.length) {
        poiCache.set(cacheKey, merged);
        if (poiCache.size > 40) {
          poiCache.delete(poiCache.keys().next().value);
        }
      }
      renderDynamicPois(merged, view);
    }

    function runFallbackSearch() {
      if (merged.length) {
        finish();
        return;
      }
      var search = createPoiSearch();
      if (!search) {
        finish();
        return;
      }
      var fallbackRadius = Math.min(10000, Math.max(1500, radius * 2));
      search.searchNearBy('', view.centerLngLat, fallbackRadius, function(status, result) {
        if (requestId !== poiRequestSeq) return;
        if (status === 'complete' || status === 'no_data') successCount++;
        if (status === 'complete' && result && result.poiList && result.poiList.pois) {
          (result.poiList.pois || []).forEach(function(poi) {
            if (!poi.location) return;
            var key = poi.id || (poi.name + '|' + poi.location.lng.toFixed(5) + '|' + poi.location.lat.toFixed(5));
            if (seen[key]) return;
            seen[key] = true;
            merged.push(poi);
          });
        }
        finish();
      });
    }

    function runNextSearch() {
      if (requestId !== poiRequestSeq) return;
      if (centerIndex >= centers.length) {
        runFallbackSearch();
        return;
      }
      var center = centers[centerIndex++];
      var search = createPoiSearch();
      if (!search) {
        finish();
        return;
      }
      var completed = false;
      var requestTimer = window.setTimeout(function() {
        if (completed) return;
        completed = true;
        window.setTimeout(runNextSearch, 220);
      }, 2600);
      search.searchNearBy('', center, radius, function(status, result) {
        if (requestId !== poiRequestSeq) return;
        if (completed) return;
        completed = true;
        window.clearTimeout(requestTimer);
        if (status === 'complete' || status === 'no_data') successCount++;
        if (status === 'complete' && result && result.poiList && result.poiList.pois) {
          (result.poiList.pois || []).forEach(function(poi) {
            if (!poi.location) return;
            var key = poi.id || (poi.name + '|' + poi.location.lng.toFixed(5) + '|' + poi.location.lat.toFixed(5));
            if (seen[key]) return;
            seen[key] = true;
            merged.push(poi);
          });
        }
        window.setTimeout(runNextSearch, 220);
      });
    }

    runNextSearch();
  }

  function requestLiveNearbyPois(view) {
    if (activeSpot) return;
    if (!view || !view.bounds || !window.AMap || !window.AMap.PlaceSearch) return;
    var search = createPoiSearch();
    if (!search) return;
    var requestId = ++poiRequestSeq;
    var radius = view.centerLngLat.distance(view.bounds.getNorthEast());
    radius = Math.min(5000, Math.max(900, Math.round(radius * 0.72)));
    search.searchNearBy('', view.centerLngLat, radius, function(status, result) {
      if (requestId !== poiRequestSeq) return;
      if (status !== 'complete' || !result || !result.poiList || !result.poiList.pois) return;
      renderDynamicPois(result.poiList.pois || [], view);
    });
  }

  function cleanPoiName(name) {
    return String(name || '')
      .replace(/^杭州西湖风景名胜区[-·]?/, '')
      .replace(/^西湖风景名胜区[-·]?/, '')
      .replace(/景区$/, '')
      .replace(/^雷峰塔景区/, '雷峰塔')
      .replace(/^雷峰塔雷峰塔$/, '雷峰塔');
  }

  function isLikelyMajorPoi(name, type) {
    if (!name) return false;
    if (/[-()]/.test(name) || /[（）]/.test(name)) return false;
    if (/(码头|雕像|雕塑|塑像|碑|坊|亭|墓|井|展厅|管理楼|售票|游客中心|停车场|打卡点|茶艺|餐厅|商店|放生池|桥洞|旧址记|老宅|观景台|殿|堂|阁|轩|苑|廊|台|厅|房|池)/.test(name)) {
      return false;
    }
    if (/(景区|公园|博物馆|纪念馆|美术馆|展览馆|植物园|动物园|湿地|古镇|古城|遗址)/.test(name)) return true;
    var parts = String(type || '').split(';');
    var isMainScenic = parts[0] === '风景名胜' && parts[1] === '风景名胜';
    var isMuseum = parts.indexOf('博物馆') !== -1 || parts.indexOf('展览馆') !== -1 || parts.indexOf('纪念馆') !== -1;
    var isPark = parts.indexOf('公园') !== -1 || parts.indexOf('动物园') !== -1 || parts.indexOf('植物园') !== -1;
    return isMainScenic || isMuseum || isPark;
  }

  function poiToSpot(poi, view) {
    var location = poi.location;
    if (!location) return null;
    var typeParts = (poi.type || '').split(';');
    var category = typeParts[0] || '旅游景点';
    var address = poi.address || [poi.pname, poi.cityname, poi.adname].filter(Boolean).join('');
    var meters = Number(poi.distance);
    if (!isFinite(meters) || !meters) meters = view.centerLngLat.distance(location);
    var distance = Math.max(0.1, meters / 1000).toFixed(1);
    var photos = poi.photos || [];
    var imageUrl = photos.length ? (photos[0].url || photos[0].photoUrl || '') : '';
    var rating = poi.biz_ext && poi.biz_ext.rating;

    var displayName = cleanPoiName(poi.name || '未命名景点');

    return {
      id: 'amap_' + (poi.id || (poi.name + '_' + location.lng + '_' + location.lat)),
      name: displayName,
      cat: category,
      lat: location.lat,
      lng: location.lng,
      dist: distance,
      fee: rating ? ('评分 ' + rating) : '景点',
      imgUrl: imageUrl,
      desc: address || poi.type || '暂无地址信息',
      best: category,
      tip: address || '暂无地址信息',
      source: 'amap',
      major: isLikelyMajorPoi(displayName, poi.type)
    };
  }

  function renderDynamicPois(pois, view) {
    if (activeSpot) return;
    var seen = {};
    var seenNames = {};
    var spots = [];
    (pois || []).forEach(function(poi) {
      if (!poi.location) return;
      var key = poi.id || (poi.name + '|' + poi.location.lng.toFixed(5) + '|' + poi.location.lat.toFixed(5));
      if (seen[key]) return;
      seen[key] = true;
      var spot = poiToSpot(poi, view);
      if (spot) {
        if (seenNames[spot.name]) return;
        seenNames[spot.name] = true;
        spots.push(spot);
      }
    });
    spots.sort(function(a, b) {
      return Number(a.dist) - Number(b.dist);
    });
    renderDynamicSpots(spots.slice(0, 50));
  }

  function renderDynamicSpots(spots) {
    if (activeSpot) {
      var keepActive = spots.some(function(spot) { return spot.id === activeSpot.id; });
      if (!keepActive) closeSpot();
    }

    if (mapObj.clearMarkers) {
      mapObj.clearMarkers();
    } else {
      markers.forEach(function(item) {
        if (item.marker) item.marker.setMap(null);
      });
    }

    markers = [];
    spots.forEach(function(spot, index) {
      var item = mapObj.addMarker(spot);
      item.el.style.animationDelay = Math.min(index, 8) * 45 + 'ms';
      markers.push(item);
    });
    if (mapObj.updateMarkerVisibility) mapObj.updateMarkerVisibility();
    applyFilter();
  }

  function initMap() {
    if (mapInited) return;
    mapInited = true;
    var overlayHost = document.querySelector('.phone');
    var sheetMask = document.getElementById('sheetMask');
    var spotSheet = document.getElementById('spotSheet');
    if (overlayHost && sheetMask && spotSheet) {
      overlayHost.appendChild(sheetMask);
      overlayHost.appendChild(spotSheet);
    }
    loadAmap().then(function() {
      createMapView(true);
    }).catch(function() {
      createMapView(false);
    });
  }

  function createMapView(useAmap) {
    var options = {
      center: [30.2465, 120.1480],
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
      onZoomEnd: (z) => {
        mapView.classList.remove('z-small', 'z-mid', 'z-large');
        mapView.classList.add(z <= 12 ? 'z-small' : (z >= 15 ? 'z-large' : 'z-mid'));
      },
      onMarkerClick: (s) => openSpot(s),
      onViewportChange: (view) => requestNearbyPois(view),
      onViewportMove: (view) => requestLiveNearbyPois(view)
    };

    mapObj = useAmap && window.AMap
      ? new AmapMap(document.getElementById('map-container'), options)
      : new SlippyMap(document.getElementById('map-container'), options);

    if (!useAmap || !window.AMap) {
      var hint = document.getElementById('mapTileHint');
      if (hint) hint.classList.add('show');
    }
    mapView.classList.add('z-mid');
    markers = [];

    SPOTS.forEach((s, i) => {
      const item = mapObj.addMarker(s);
      item.el.style.animationDelay = (i * 60) + 'ms';
      markers.push(item);
    });
    if (mapObj.updateMarkerVisibility) mapObj.updateMarkerVisibility();
    if (useAmap && window.AMap) {
      setTimeout(function() {
        if (mapObj && mapObj.scheduleViewportChange) mapObj.scheduleViewportChange(0);
      }, 300);
      setTimeout(function() {
        locateUser(true);
      }, 900);
    }
  }

  // 打开机位信息卡片
  function openSpot(s) {
    activeSpot = s;
    markers.forEach(item => {
      var selected = item.spot.id === s.id;
      item.el.classList.toggle('pin-active', selected);
      if (item.marker && item.marker.setzIndex) {
        item.marker.setzIndex(selected ? 900 : 220);
      }
    });
    var sheetImg = document.getElementById('sheetImg');
    setImageWithFallback(sheetImg, s.imgUrl || (s.img ? 'assets/map/' + s.img : ''));
    sheetImg.alt = s.name;
    document.getElementById('sheetName').textContent = s.name;
    document.getElementById('sheetCat').textContent = s.cat;
    document.getElementById('sheetDesc').textContent = s.desc;
    document.getElementById('sheetTime').textContent = s.best;
    document.getElementById('sheetTip').textContent = s.tip;
    document.getElementById('sheetTags').innerHTML =
      '<span class="sheet-tag dark">' + s.dist + 'km</span>' +
      '<span class="sheet-tag">' + s.cat + '</span>' +
      '<span class="sheet-tag dark">' + s.fee + '</span>';
    document.getElementById('sheetFav').classList.toggle('liked', !!s.liked);
    mapObj.flyTo([s.lat, s.lng], Math.max(mapObj.getZoom(), 15), 700);
    const sheet = document.getElementById('spotSheet');
    sheet.classList.remove('closing');
    sheet.classList.add('show');
    document.getElementById('sheetMask').classList.add('show');
    sheet.querySelector('.sheet-body').scrollTop = 0;

  }

  function closeSpot() {
    var hadActiveSpot = !!activeSpot;
    const sheet = document.getElementById('spotSheet');
    sheet.classList.add('closing');
    sheet.classList.remove('show');
    document.getElementById('sheetMask').classList.remove('show');
    markers.forEach(item => {
      item.el.classList.remove('pin-active');
      if (item.marker && item.marker.setzIndex) item.marker.setzIndex(220);
    });
    activeSpot = null;
    if (hadActiveSpot && mapObj && mapObj.scheduleViewportChange) {
      mapObj.scheduleViewportChange(0);
    }
  }

  // 筛选（分类 + 关键词）
  function applyFilter() {
    const q = currentQuery.trim().toLowerCase();
    let visible = 0;
    markers.forEach(item => {
      const s = item.spot;
      const okCat = currentCat === '全部' || s.cat === currentCat;
      const okQ = !q || s.name.toLowerCase().indexOf(q) !== -1 || s.desc.toLowerCase().indexOf(q) !== -1;
      const show = okCat && okQ;
      if (show) visible++;
      const wasHidden = item.el.classList.contains('pin-hidden');
      item.el.classList.toggle('pin-hidden', !show);
      if (item.setFilterVisible) item.setFilterVisible(show);
      else if (item.setVisible) item.setVisible(show);
      if (show && wasHidden) {
        item.el.classList.remove('pop');
        void item.el.offsetWidth;
        item.el.classList.add('pop');
      }
    });
    document.getElementById('mapCount').textContent = visible + ' 个景点';
    document.getElementById('mapEmpty').classList.toggle('show', visible === 0);
    if (activeSpot) {
      const s = activeSpot;
      const okCat = currentCat === '全部' || s.cat === currentCat;
      const okQ = !q || s.name.toLowerCase().indexOf(q) !== -1 || s.desc.toLowerCase().indexOf(q) !== -1;
      if (!(okCat && okQ)) closeSpot();
    }
  }

  // 分类切换
  document.querySelectorAll('.map-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.map-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCat = chip.getAttribute('data-cat');
      applyFilter();
    });
  });

  // 搜索
  const mapSearchInput = document.getElementById('mapSearchInput');
  const mapSearchClear = document.getElementById('mapSearchClear');
  mapSearchInput.addEventListener('input', () => {
    currentQuery = mapSearchInput.value;
    mapSearchClear.classList.toggle('show', !!currentQuery);
    applyFilter();
  });
  mapSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = markers.find(m => !m.el.classList.contains('pin-hidden'));
      if (first) mapObj.flyTo([first.spot.lat, first.spot.lng], Math.max(mapObj.getZoom(), 15), 600);
      e.target.blur();
    }
  });
  mapSearchClear.addEventListener('click', () => {
    mapSearchInput.value = '';
    currentQuery = '';
    mapSearchClear.classList.remove('show');
    applyFilter();
    mapSearchInput.focus();
  });

  // 缩放按钮
  document.getElementById('mapZoomIn').addEventListener('click', () => mapObj.zoomIn());
  document.getElementById('mapZoomOut').addEventListener('click', () => mapObj.zoomOut());

  // 定位 / 回到中心
  function resetView() {
    mapObj.flyTo([30.2465, 120.1480], 13, 800);
  }

  function applyUserLocation(lat, lng, alreadyGcj, shouldRecenter, approximate) {
    var locateButton = document.getElementById('mapLocate');
    userLocationLoading = false;
    locateButton.classList.remove('locating');
    var ll = [lat, lng];
    userLocation = { lat: lat, lng: lng };
    mapObj.addDot(ll, alreadyGcj);
    locateButton.classList.add('has-location');
    if (shouldRecenter) {
      mapObj.flyTo(ll, Math.max(14, Math.min(mapObj.getZoom(), 15)), 800, alreadyGcj);
      showToast(approximate ? '已使用网络大致定位' : '已定位到当前位置');
    }
  }

  function finishLocationFailure(shouldRecenter) {
    var locateButton = document.getElementById('mapLocate');
    userLocationLoading = false;
    locateButton.classList.remove('locating');
    if (shouldRecenter) {
      showToast('定位失败，请检查浏览器定位权限');
    }
  }

  function locateWithAmap(shouldRecenter) {
    if (!window.AMap || !window.AMap.Geolocation) {
      finishLocationFailure(shouldRecenter);
      return;
    }
    var geolocation = new AMap.Geolocation({
      enableHighAccuracy: false,
      maximumAge: 60000,
      timeout: 10000,
      noGeoLocation: 1,
      noIpLocate: 0,
      showButton: false,
      showMarker: false,
      showCircle: false,
      panToLocation: false
    });
    geolocation.getCurrentPosition(function(status, result) {
      if (status === 'complete' && result && result.position) {
        applyUserLocation(result.position.getLat(), result.position.getLng(), true, shouldRecenter, true);
        return;
      }
      locateWithNetworkIp(shouldRecenter);
    });
  }

  function locateWithNetworkIp(shouldRecenter) {
    var controller = window.AbortController ? new AbortController() : null;
    var timer = window.setTimeout(function() {
      if (controller) controller.abort();
    }, 6000);
    fetch('https://ipwho.is/', controller ? { signal: controller.signal } : undefined)
      .then(function(response) { return response.json(); })
      .then(function(data) {
        window.clearTimeout(timer);
        if (data && data.success && isFinite(data.latitude) && isFinite(data.longitude)) {
          applyUserLocation(data.latitude, data.longitude, false, shouldRecenter, true);
          return;
        }
        finishLocationFailure(shouldRecenter);
      })
      .catch(function() {
        window.clearTimeout(timer);
        finishLocationFailure(shouldRecenter);
      });
  }

  function locateWithBrowserLowAccuracy(shouldRecenter) {
    if (!navigator.geolocation) {
      locateWithAmap(shouldRecenter);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyUserLocation(pos.coords.latitude, pos.coords.longitude, false, shouldRecenter);
      },
      () => {
        locateWithAmap(shouldRecenter);
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
    );
  }

  function locateUser(shouldRecenter) {
    var locateButton = document.getElementById('mapLocate');
    if (!navigator.geolocation) {
      locateWithAmap(shouldRecenter);
      return;
    }
    if (userLocationLoading) return;

    userLocationLoading = true;
    locateButton.classList.add('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyUserLocation(pos.coords.latitude, pos.coords.longitude, false, shouldRecenter);
      },
      () => {
        locateWithBrowserLowAccuracy(shouldRecenter);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  document.getElementById('mapLocate').addEventListener('click', () => locateUser(true));

  // 机位列表抽屉
  function buildListPanel() {
    const track = document.getElementById('mapListTrack');
    SPOTS.forEach(s => {
      const card = document.createElement('div');
      card.className = 'map-list-card';
      card.innerHTML = '<img src="assets/map/' + s.img + '" alt="' + s.name + '">' +
        '<div class="mlc-name">' + s.name + '</div>' +
        '<div class="mlc-meta">' + s.cat + ' · ' + s.dist + 'km</div>';
      card.addEventListener('click', () => {
        document.getElementById('mapListPanel').classList.remove('show');
        openSpot(s);
      });
      track.appendChild(card);
    });
    document.getElementById('mapListCount').textContent = SPOTS.length;
  }
  document.getElementById('mapListBtn').addEventListener('click', () => {
    document.getElementById('mapListPanel').classList.toggle('show');
  });

  // 卡片关闭：遮罩 / 关闭按钮
  document.getElementById('sheetMask').addEventListener('click', closeSpot);
  document.getElementById('sheetClose').addEventListener('click', closeSpot);

  // 卡片手势下滑关闭
  const spotSheetEl = document.getElementById('spotSheet');
  const sheetHandleEl = document.getElementById('sheetHandle');
  let dragStartY = null;
  let dragDy = 0;
  sheetHandleEl.addEventListener('pointerdown', (e) => {
    dragStartY = e.clientY;
    spotSheetEl.style.transition = 'none';
    sheetHandleEl.setPointerCapture(e.pointerId);
  });
  sheetHandleEl.addEventListener('pointermove', (e) => {
    if (dragStartY === null) return;
    dragDy = e.clientY - dragStartY;
    if (dragDy > 0) spotSheetEl.style.transform = 'translateY(' + dragDy + 'px)';
  });
  sheetHandleEl.addEventListener('pointerup', () => {
    if (dragStartY === null) return;
    spotSheetEl.style.transition = '';
    spotSheetEl.style.transform = '';
    if (dragDy > 70) closeSpot();
    dragStartY = null;
    dragDy = 0;
  });

  // 导航 / 收藏
  document.getElementById('sheetNav').addEventListener('click', () => {
    if (!activeSpot) return;
    const name = activeSpot.name;
    closeSpot();
    showToast('已为你规划前往「' + name + '」的路线（演示）');
  });
  
  // 地图卡片 → 查看详情
  document.getElementById('sheetDetail').addEventListener('click', () => {
    if (!activeSpot) return;
    const s = activeSpot;
    closeSpot();
    openSpotDetail('map-view');
  });

  // ===== 热门机位页：分类标签切换 =====
  document.querySelectorAll('.hot-spots-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.hot-spots-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.textContent;
      document.querySelectorAll('.hot-spot-item').forEach(item => {
        const cats = item.getAttribute('data-cat') || '';
        const show = cat === '全部' || cats.split(' ').indexOf(cat) !== -1;
        item.style.display = show ? 'flex' : 'none';
      });
    });
  });
  document.getElementById('sheetFav').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!activeSpot) return;
    activeSpot.liked = !activeSpot.liked;
    document.getElementById('sheetFav').classList.toggle('liked', !!activeSpot.liked);
    showToast(activeSpot.liked ? '已收藏' : '已取消收藏');
  });

  // ============================================================
  // 底部导航：广场 / 地图 / 消息 / 我的
  // ============================================================
  function showTab(name) {
    goPage(name);
  }

  if (navItems.length > 0) {
    const tabDefs = [
      { el: navItems[0], name: 'home' },
      { el: navItems[1], name: 'map' },
      { el: navItems[2], name: 'msg' },
      { el: navItems[3], name: 'mine' }
    ];
    tabDefs.forEach(t => t.el.addEventListener('click', () => showTab(t.name)));
  }

  // 发布按钮
  const navPublish = document.querySelector('.nav-publish');
  if (navPublish) navPublish.addEventListener('click', () => goPage('publish'));

  // 金刚区：附近速达 → 地图，其余无跳转
  document.querySelectorAll('.jingang-item').forEach(item => {
    item.addEventListener('click', () => {
      const span = item.querySelector('span');
      const name = span ? span.textContent : '';
      if (name === '附近速达') {
        showTab('map');
      }
    });
  });

  // 热门卡片 GO 按钮
  document.querySelectorAll('.hot-card-go').forEach(btn => {
    btn.addEventListener('click', () => showToast('演示页面'));
  });

  // 广场主标签（推荐 / 关注 / 附近）
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabText = tab.textContent.trim();
      document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.main-tab').forEach(t => {
        if (t.textContent.trim() === tabText) {
          t.classList.add('active');
        }
      });
    });
  });

  // 我的页菜单 / 消息列表点击事件暂不实现（页面未完成）


  // 展开/收起回复
  // ============================================================
  // 消息页交互
  // ============================================================
  // 消息列表项点击事件暂不实现（页面未完成）
  // 快捷消息项点击事件暂不实现（页面未完成）
  document.querySelectorAll('.msg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.msg-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
  // 消息页图标按钮点击事件：搜索暂不实现，添加按钮由onclick处理

  function toggleReplies(btn) {
    var subComments = btn.previousElementSibling;
    var hiddenReplies = subComments.querySelectorAll('.hidden-reply');
    var isExpanded = btn.classList.contains('expanded');
    
    if (isExpanded) {
      hiddenReplies.forEach(function(el) {
        el.style.display = 'none';
      });
      btn.textContent = btn.textContent.replace('收起', '展开');
      btn.classList.remove('expanded');
    } else {
      hiddenReplies.forEach(function(el) {
        el.style.display = 'flex';
      });
      btn.textContent = btn.textContent.replace('展开', '收起');
      btn.classList.add('expanded');
    }
  }

  function toggleFollow() {
    var btn = document.getElementById('detailFollowBtn');
    var state = btn.getAttribute('data-state') || '0';
    if (state === '0') {
      // 状态1：黑色描边，黑色文字"已关注"
      btn.style.borderColor = '#1a1a1a';
      btn.style.color = '#1a1a1a';
      btn.textContent = '已关注';
      btn.setAttribute('data-state', '1');
    } else {
      // 状态0：橘色描边，橘色文字"关注"
      btn.style.borderColor = '#FF7A00';
      btn.style.color = '#FF7A00';
      btn.textContent = '关注';
      btn.setAttribute('data-state', '0');
    }
    try {
      sessionStorage.setItem('jingdian_post_follow', state === '0' ? 'true' : 'false');
    } catch (e) {}
  }

  // 页面加载时恢复关注状态
  function restoreFollowState() {
    var btn = document.getElementById('detailFollowBtn');
    if (!btn) return;
    try {
      if (sessionStorage.getItem('jingdian_post_follow') === 'true') {
        btn.style.borderColor = '#1a1a1a';
        btn.style.color = '#1a1a1a';
        btn.textContent = '已关注';
        btn.setAttribute('data-state', '1');
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreFollowState);
  } else {
    restoreFollowState();
  }

  function openCommentPopup() {
    document.getElementById('commentPopupOverlay').classList.add('active');
  }

  function closeCommentPopup() {
    document.getElementById('commentPopupOverlay').classList.remove('active');
  }
  
  // 评论喜欢按钮切换
  function toggleLike(btn) {
    const wrapper = btn.closest('.like-wrapper');
    const countEl = wrapper.querySelector('.like-count');
    let count = parseInt(countEl.textContent);
    
    if (btn.classList.contains('active')) {
      // 取消喜欢
      btn.classList.remove('active');
      count = count - 1;
    } else {
      // 喜欢
      btn.classList.add('active');
      count = count + 1;
      // 如果不喜欢也激活了，取消不喜欢
      const dislikeBtn = btn.closest('.comment-like').querySelector('.dislike-btn');
      if (dislikeBtn.classList.contains('active')) {
        dislikeBtn.classList.remove('active');
        // 如果评论是折叠的，展开它
        const commentItem = btn.closest('.comment-item, .sub-comment-item');
        if (commentItem && commentItem.classList.contains('collapsed')) {
          commentItem.classList.remove('collapsed');
        }
      }
    }
    countEl.textContent = count;
  }
  
  // 评论不喜欢按钮切换
  function toggleDislike(btn) {
    const commentItem = btn.closest('.comment-item, .sub-comment-item');
    
    if (btn.classList.contains('active')) {
      // 取消不喜欢，展开评论
      btn.classList.remove('active');
      if (commentItem) {
        commentItem.classList.remove('collapsed');
      }
    } else {
      // 不喜欢，折叠评论
      btn.classList.add('active');
      // 如果喜欢也激活了，取消喜欢
      const likeBtn = btn.closest('.comment-like').querySelector('.like-btn');
      if (likeBtn.classList.contains('active')) {
        likeBtn.classList.remove('active');
        const countEl = likeBtn.closest('.like-wrapper').querySelector('.like-count');
        let count = parseInt(countEl.textContent);
        countEl.textContent = count - 1;
      }
      // 折叠评论
      if (commentItem) {
        commentItem.classList.add('collapsed');
      }
    }
  }
  
  // 恢复折叠的评论
  function restoreComment(hintEl) {
    const commentItem = hintEl.closest('.comment-item, .sub-comment-item');
    if (commentItem) {
      commentItem.classList.remove('collapsed');
      // 取消不喜欢状态
      const dislikeBtn = commentItem.querySelector('.dislike-btn');
      if (dislikeBtn) {
        dislikeBtn.classList.remove('active');
      }
    }
  }
  
  // 初始化所有评论项的交互
  function initCommentInteractions() {
    // 处理所有评论项（主评论和子评论）
    const commentItems = document.querySelectorAll('.comment-item, .sub-comment-item');
    
    commentItems.forEach(item => {
      // 检查是否已经初始化过
      if (item.classList.contains('interaction-initialized')) return;
      item.classList.add('interaction-initialized');
      
      // 给评论项添加折叠提示（如果还没有）
      if (!item.querySelector('.collapsed-hint')) {
        const avatar = item.querySelector('.comment-avatar');
        if (avatar) {
          const hint = document.createElement('div');
          hint.className = 'collapsed-hint';
          hint.onclick = function() { restoreComment(this); };
          hint.innerHTML = '<span>该评论已被折叠</span><span style="text-decoration: underline;">点击展开</span>';
          avatar.after(hint);
        }
      }
      
      // 给喜欢按钮添加类名和事件（如果还没有）
      const likeImgs = item.querySelectorAll('.comment-like img[src*="heart.png"]');
      likeImgs.forEach(img => {
        if (!img.classList.contains('like-btn')) {
          img.classList.add('like-btn');
          img.onclick = function() { toggleLike(this); };
          // 给外层span添加类名
          const wrapper = img.closest('span');
          if (wrapper && !wrapper.classList.contains('like-wrapper')) {
            wrapper.classList.add('like-wrapper');
          }
          // 给数字span添加类名
          const countSpan = wrapper.querySelector('span');
          if (countSpan && !countSpan.classList.contains('like-count')) {
            countSpan.classList.add('like-count');
          }
        }
      });
      
      // 给不喜欢按钮添加类名和事件（如果还没有）
      const dislikeImgs = item.querySelectorAll('.comment-like img[src*="heart-off"]');
      dislikeImgs.forEach(img => {
        if (!img.classList.contains('dislike-btn')) {
          img.classList.add('dislike-btn');
          img.onclick = function() { toggleDislike(this); };
        }
      });
    });
  }
  
  // 页面加载完成后初始化评论交互
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommentInteractions);
  } else {
    initCommentInteractions();
  }
  
  // 打开发布页面
  function openPublishPage() { goPage('publish'); }
  
  // 关闭发布页面，返回进入本页之前的页面
  function closePublishPage() { goBack('home'); }

  // 状态栏样式由各页面内联脚本控制

  // 打开热门机位页面
  function openHotSpots() { goPage('hot-spots'); }
  
  // 关闭热门机位页面，返回进入本页之前的页面
  function closeHotSpots() { goBack('home'); }

