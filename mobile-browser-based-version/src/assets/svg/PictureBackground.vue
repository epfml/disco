<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    :class="customClass"
    :viewBox="viewBox"
    :width="width"
    :height="height"
  >
    <path
      d="M5 8.5c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5c0 .829-.672 1.5-1.5 1.5s-1.5-.671-1.5-1.5zm9 .5l-2.519 4-2.481-1.96-4 5.96h14l-5-8zm8-4v14h-20v-14h20zm2-2h-24v18h24v-18z"
    />
  </svg>
</template>
<script>
export default {
  name: 'picture-background',
  props: {
    customClass: { default: 'fill-current w-4 h-4 ml-auto pt-', type: String },
    viewBox: { default: '0 0 24 24', type: String },
    width: { default: 24, type: Number },
    height: { default: 24, type: Number },
  },
};
</script>
