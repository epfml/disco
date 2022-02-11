<template>
  <!-- Main Page Header-->
  <div>
    <h1 class="text-xl pl-10 font-medium leading-none">
      <span class="text-primary-dark dark:text-primary-light"
        >{{ $t('home.title.name') }}
      </span>
      -
      <span class="text-primary-dark dark:text-primary-light">{{
        $t('home.title.start')
      }}</span
      >{{ $t('home.title.middle') }}
      <span class="text-primary-dark dark:text-primary-light">{{
        $t('home.title.end')
      }}</span>
    </h1>
  </div>
</template>

<script>
export default {
  name: 'custom-header'
}
</script>
