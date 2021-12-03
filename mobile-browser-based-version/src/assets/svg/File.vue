<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    :class="customClass"
    :viewBox="viewBox"
    :width="width"
    :height="height"
  >
    <path d="M15 2v5h5v15h-16v-20h11zm1-2h-14v24h20v-18l-6-6z" />
  </svg>
</template>
<script>
export default {
  name: 'file',
  props: {
    customClass: { default: 'fill-current w-4 h-4 ml-auto pt-1', type: String },
    viewBox: { default: '0 0 24 24', type: String },
    width: { default: '24', type: String },
    height: { default: '24', type: String },
  },
};
</script>
