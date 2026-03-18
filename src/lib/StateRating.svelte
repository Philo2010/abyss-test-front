<script lang="ts">
  import type { FormEventHandler } from "svelte/elements";

  let {
    value = $bindable(0),
    name = "rating",
    min = 0,
    max = 5
  } = $props();
  
  function handleInput(event: Event) {
    value = parseInt((event.target as HTMLInputElement).value);
  }
</script>

<div class="star-rating">
  <div class="slider-container">
    <input
      type="range"
      {name}
      id={name}
      {min}
      {max}
      step="1"
      {value}
      oninput={handleInput}
    />
    <div class="ticks">
      {#each Array(max - min + 1) as _, i}
        <span>{min + i}</span>
      {/each}
    </div>
  </div>
</div>

<style>
  .star-rating {
    margin: 20px 0;
  }

  h3 {
    margin-bottom: 10px;
  }

  .slider-container {
    width: 300px;
    max-width: 100%;
    margin: auto;
  }

  input[type="range"] {
    width: 100%;
    appearance: none;
    height: 10px;
    background: linear-gradient(to right, #ddd 0%, #ddd 100%);
    border-radius: 5px;
    outline: none;
  }

  /* Slider thumb */
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #007bff;
    cursor: pointer;
  }

  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #007bff;
    cursor: pointer;
  }

  /* Ticks */
  .ticks {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    padding-top: 5px;
  }
</style>