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
      class="pointer-events-none"
      d="M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"
    />
  </svg>
</template>
<script>
export default {
  name: "bin",
  props: {
    customClass: {
      default: "pointer-events-none fill-current w-4 h-4 ml-auto",
      type: String,
    },
    viewBox: { default: "0 0 24 24", type: String },
    width: {default:"24", type:String},
    height: {default:"24",type:String},
  },
};
</script>
