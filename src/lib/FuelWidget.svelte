<script lang="ts">
    let { count = $bindable() } = $props();


    //can be negative
	function add(amount: number) {
		count += amount;
        if (count < 0) {
            count = 0;
        }
	}
</script>



<div class="grid">
    <button type="button" onclick={()=> {add(10)}}>+10</button>
    <div></div>
    <button type="button" onclick={()=> {add(-10)}}>-10</button>
    <button type="button" onclick={()=> {add(5)}}>+5</button>
    <div class="display-point">{count}</div>
    <button type="button" onclick={()=> {add(-5)}}>-5</button>
    <button type="button" onclick={()=> {add(1)}}>+1</button>
    <div></div>
    <button type="button" onclick={()=> {add(-1)}}>-1</button>
</div>

<style>
    .grid {
        display: grid;
        grid-template-columns: 50px 50px 50px;
        gap: 5px;
        justify-content: center;
    }

    .grid button {
        border-radius: 3%;
        height: 50px;
        width: 50px;
        background-color: darkslategrey;
    }

    .display-point {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3%;
        height: 50px;
        width: 50px;
        background-color: darkslategrey;
    }

</style>