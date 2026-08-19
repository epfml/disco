<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    :class="customClass"
    :viewBox="viewBox"
  >
    <path
      d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM256 224L384 224C401.7 224 416 238.3 416 256L416 384C416 401.7 401.7 416 384 416L256 416C238.3 416 224 401.7 224 384L224 256C224 238.3 238.3 224 256 224z"
    />
  </svg>
</template>
<script lang="ts">
export default {
  props: {
    customClass: {
      default: "w-7 h-7",
      type: String,
    },
    viewBox: { default: "0 0 640 640", type: String },
  },
};
</script>
