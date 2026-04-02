<template>
  <v-app>
    <AppHeader />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
import AppHeader from '@/components/Header.vue';

export default {
    name: 'App',
    components: {
        AppHeader,
    },
};
</script>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html, body {
    background: #141414;
    color: #fff;
    font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
}

::-webkit-scrollbar {
    width: 8px;
}
::-webkit-scrollbar-track {
    background: #141414;
}
::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: #555;
}

a {
    text-decoration: none;
    color: inherit;
}
</style>
