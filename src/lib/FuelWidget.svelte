<script lang="ts">
  let { count = $bindable(0) } = $props();

  function add(amount: number) {
    count += amount;
    if (count < 0) count = 0;
  }

  let flash = $state(false);
  function tap(amount: number) {
    add(amount);
    flash = false;
    requestAnimationFrame(() => {
      flash = true;
      setTimeout(() => (flash = false), 120);
    });
  }
</script>

<div class="fuel-widget">
  <div class="counter" class:flash>{count}</div>

  <div class="btn-row">
    <button type="button" class="fuel-btn add big" onclick={() => tap(10)}>+10</button>
    <button type="button" class="fuel-btn add med" onclick={() => tap(5)}>+5</button>
    <button type="button" class="fuel-btn add small" onclick={() => tap(1)}>+1</button>
  </div>
  <div class="btn-row">
    <button type="button" class="fuel-btn sub big" onclick={() => tap(-10)} disabled={count < 10}>−10</button>
    <button type="button" class="fuel-btn sub med" onclick={() => tap(-5)} disabled={count < 5}>−5</button>
    <button type="button" class="fuel-btn sub small" onclick={() => tap(-1)} disabled={count < 1}>−1</button>
  </div>
</div>

<style>
  .fuel-widget {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }

  .counter {
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    background: #111;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    width: 100%;
    text-align: center;
    padding: 0.3rem 0;
    transition: background 0.08s, color 0.08s;
    user-select: none;
  }

  .counter.flash {
    background: rgba(60, 179, 113, 0.25);
    color: #5dde8a;
  }

  .btn-row {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .fuel-btn {
    flex: 1;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: transform 0.08s, opacity 0.15s;
    touch-action: manipulation;
    padding: 0;
  }

  .fuel-btn:active:not(:disabled) {
    transform: scale(0.94);
  }

  .fuel-btn:disabled {
    opacity: 0.22;
    cursor: not-allowed;
  }

  /* sizes */
  .big { height: 64px; font-size: 1.05rem; }
  .med { height: 64px; font-size: 1rem; }
  .small { height: 64px; font-size: 0.95rem; }

  /* add row — green tones */
  .add.big { background: #1a4d2e; color: #5dde8a; border: 1.5px solid #2a6e42; }
  .add.med { background: #163e26; color: #4ecf7a; border: 1.5px solid #215933; }
  .add.small { background: #112e1c; color: #3dbe69; border: 1.5px solid #1a4228; }

  .add:hover:not(:disabled) { filter: brightness(1.15); }

  /* sub row — muted red tones */
  .sub.big { background: #3d1414; color: #e07070; border: 1.5px solid #5a2020; }
  .sub.med { background: #321010; color: #d06060; border: 1.5px solid #4a1a1a; }
  .sub.small { background: #280d0d; color: #c05050; border: 1.5px solid #3c1515; }

  .sub:hover:not(:disabled) { filter: brightness(1.15); }
</style>
