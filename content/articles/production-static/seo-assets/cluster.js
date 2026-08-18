(() => {
  const money = (value) => new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 0}).format(Math.max(0, Number(value) || 0));
  if (location.hostname === 'localhost' || location.protocol === 'file:') {
    document.querySelectorAll('[data-local-href]').forEach((link) => { link.href = link.dataset.localHref; });
  }

  document.querySelectorAll('[data-result-tool]').forEach((tool) => {
    const result = tool.querySelector('[data-tool-result]');
    const title = tool.querySelector('[data-result-title]');
    const body = tool.querySelector('[data-result-body]');
    const list = tool.querySelector('[data-result-list]');
    tool.querySelectorAll('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        tool.querySelectorAll('[data-choice]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        title.textContent = button.dataset.title;
        body.textContent = button.dataset.body;
        list.innerHTML = (button.dataset.checks || '').split('|').filter(Boolean).map((item) => `<li>${item}</li>`).join('');
        result.hidden = false;
        localStorage.setItem(`cnr_tool_${location.pathname}`, button.dataset.choice);
        result.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      });
    });
  });

  document.querySelectorAll('[data-cost-calculator]').forEach((form) => {
    const calculate = () => {
      const total = Number(form.elements.total.value) || 0;
      const area = Number(form.elements.area.value) || 0;
      const downRate = (Number(form.elements.down_rate.value) || 0) / 100;
      const deedRate = (Number(form.elements.deed_rate.value) || 0) / 100;
      const fundRate = Number(form.elements.fund_rate.value) || 0;
      const annualRate = (Number(form.elements.annual_rate.value) || 0) / 100;
      const months = (Number(form.elements.years.value) || 0) * 12;
      const down = total * downRate;
      const loan = Math.max(0, total - down);
      const monthlyRate = annualRate / 12;
      const monthly = months && loan ? (monthlyRate ? loan * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1) : loan / months) : 0;
      form.querySelector('[data-down]').textContent = `¥${money(down)}`;
      form.querySelector('[data-upfront]').textContent = `¥${money(down + total * deedRate + area * fundRate)}`;
      form.querySelector('[data-monthly]').textContent = `¥${money(monthly)}`;
    };
    form.addEventListener('submit', (event) => { event.preventDefault(); calculate(); });
    form.querySelectorAll('input,select').forEach((field) => field.addEventListener('change', calculate));
    calculate();
  });

  document.querySelectorAll('[data-checklist]').forEach((list) => {
    const boxes = [...list.querySelectorAll('input[type="checkbox"]')];
    const count = list.closest('.tool-panel').querySelector('[data-check-count]');
    const storageKey = `cnr_checklist_${location.pathname}`;
    const saved = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    boxes.forEach((box) => { box.checked = saved.has(box.value); });
    const update = () => {
      const selected = boxes.filter((box) => box.checked).map((box) => box.value);
      count.textContent = `${selected.length}/${boxes.length}`;
      localStorage.setItem(storageKey, JSON.stringify(selected));
    };
    boxes.forEach((box) => box.addEventListener('change', update));
    update();
    const reset = list.closest('.tool-panel').querySelector('[data-check-reset]');
    if (reset) reset.addEventListener('click', () => { boxes.forEach((box) => { box.checked = false; }); update(); });
  });

  document.querySelectorAll('[data-print]').forEach((button) => button.addEventListener('click', () => window.print()));
  document.querySelectorAll('[data-preview-form]').forEach((form) => form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const message = form.querySelector('.form-message');
    const button = form.querySelector('[type="submit"]');
    const data = new FormData(form);
    const name = String(data.get('name') || data.get('offer') || '文章资料领取').trim().slice(0, 30);
    const phone = String(data.get('phone') || '').trim();
    button.disabled = true;
    message.textContent = '正在提交…';
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({name, phone, company: ''}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || '提交失败，请稍后再试。');
      form.elements.phone.value = '';
      message.textContent = '提交成功，工作人员会联系您发送所选资料。';
    } catch (error) {
      message.textContent = error.message || '提交失败，请稍后再试。';
    } finally {
      button.disabled = false;
    }
  }));
})();
