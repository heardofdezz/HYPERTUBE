<template>
  <div class="home">
    <v-layout align-center justify-center >
      <div></div>
          <v-flex xs12 sm8 md4>
            <v-card class="elevation-12" dark color="rgb(50, 0, 0, 0.7)">
              <v-toolbar color="transparent" flat>
                <v-spacer></v-spacer>
                <v-toolbar-title>Movies List</v-toolbar-title>
                <v-spacer></v-spacer>
              </v-toolbar>
              
            </v-card>
          </v-flex>
        </v-layout>
  </div>
</template>

<script>
import MoviesService from '@/services/MoviesService';

export default {
  
  data() {
    return {
      movies: []
    }
  },
  methods: {
    async MoviesIndex() {
      try {
        const response = await MoviesService.MoviesIndex();
        this.movies = response.data;
      } catch (err) {
        console.error(err);
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

.home {
  width: 100%;
    height: 10%; 
    position: absolute;
    top: 0;
    left: 0;
font-family: 'Kameron', serif;
padding-top: 90px;
  /* background: url( 'https://www.generationcable.net/wp-content/uploads/2017/03/Netflix-Background.jpg') no-repeat center center;
    background-size: cover; */
    /* background-color: red; */
    transform: scale(1.0);
}
</style>
