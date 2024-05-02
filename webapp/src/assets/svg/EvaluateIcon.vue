<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    :class="customClass"
    :viewBox="viewBox"
    stroke="currentColor"
  >
      <path d="M1091,264h-22a1,1,0,0,1-1-1V241a1,1,0,0,1,2,0v21h21A1,1,0,0,1,1091,264Zm-5-4a1,1,0,0,1-1-1V248a1,1,0,0,1,2,0v11A1,1,0,0,1,1086,260Zm-4,0h0a1,1,0,0,1-1-1v-7a1,1,0,0,1,1-1h0a1,1,0,0,1,1,1v7A1,1,0,0,1,1082,260Zm-4,0a1,1,0,0,1-1-1V243a1,1,0,0,1,2,0v16A1,1,0,0,1,1078,260Zm-4,0a1,1,0,0,1-1-1V249a1,1,0,0,1,2,0v10A1,1,0,0,1,1074,260Z" transform="translate(-1068 -240)"/>
  </svg>
</template>
<script lang="ts">
export default {
  name: 'CreateIcon',
  props: {
    customClass: {
      default: 'w-6 h-6',
      type: String
    },
    viewBox: { default: '-3 -1 28 28', type: String }
  }
}
</script>
