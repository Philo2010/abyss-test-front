<script lang="ts">
  let { current_time_in_seconds = $bindable(0) }: { current_time_in_seconds?: number } = $props();

  let is_button_pressed = $state(false);

  $effect(() => {
    if (!is_button_pressed) return;

    const interval = setInterval(() => {
      current_time_in_seconds += 1;
    }, 1000);

    return () => clearInterval(interval);
  });

  function format(seconds: number) {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
</script>

<button type="button" class="auto-timer" class:running={is_button_pressed} onclick={() => (is_button_pressed = !is_button_pressed)}>
  <p>{format(current_time_in_seconds)}</p>
</button>

<style>
  .auto-timer {
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
    height: 64px;
    border-radius: 10px;
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    background: #1a1a1a;
    color: #fff;
    font-family: inherit;
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    cursor: pointer;
    touch-action: manipulation;
    transition: all 0.12s;
  }

  .auto-timer:active { transform: scale(0.97); }

  .auto-timer.running {
    background: rgba(60, 179, 113, 0.15);
    border-color: rgba(60, 179, 113, 0.4);
    color: #5dde8a;
  }

  .auto-timer p { margin: 0; }
</style>
