<template>
  <div class="home">
    <v-layout align-center justify-center >
      <div></div>
          <v-flex xs12 sm8 md4>
            <v-card class="elevation-12" dark color="rgb(50, 0, 0, 0.7)">
              <v-toolbar color="transparent" flat>
                <v-spacer></v-spacer>
                <v-toolbar-title>SIGN UP!</v-toolbar-title>
                <v-spacer></v-spacer>
              </v-toolbar>
              <v-card-text>
                <v-form name="signup-form" autocomplete="off">
                  <v-text-field
                  v-model="email"
                    label="Em@il"
                    name="email"
                    type="text"
                  ></v-text-field>

                   <v-text-field
                   v-model="username"
                    label="Username"
                    name="username"
                    type="text"
                  ></v-text-field>

                  <v-text-field
                    v-model="firstname"
                    label="First Name"
                    name="firstname"
                    type="text"
                  ></v-text-field>

                   <v-text-field
                   v-model="lastname"
                    label="Last Name"
                    name="lastname"
                    type="text"
                  ></v-text-field>

                  <v-text-field
                    v-model="password"
                    id="password"
                    label="Password"
                    name="password"
                    type="password"
                  ></v-text-field>

                    </v-form>
                  <br>
                    <div class="error" v-html="error" />
                  <br>

                   <v-btn 
                   @click="register"
                   color="#4CAF50">Sign Up</v-btn>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
  </div>
</template>
<script>
import UsersService from '@/services/UsersService'
export default {
  data () {
    return {
        email:'',
        username:'',
        firstname:'',
        lastname:'',
        password: '',
        error: null
    }
  },
  methods: {
    async register() {
      try{
            const response = await UsersService.register({
              email: this.email,
              username: this.username,
              firstname: this.firstname,
              lastname: this.lastname,
              password: this.password
        })
        
        this.$store.dispatch('setToken', response.data.token)
        this.$store.dispatch('setUser', response.data.user).then((result) => {
          console.log(result)
        }).catch((err) => {
          console.log(err)
        });
        this.router.push('/Login')
     } catch (error){
       this.error = error.response.data.error
     }    
        console.log('register button has been clicked', this.email, this.password)
    }
  }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>


.home {
  width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    padding-top: 90px;
font-family: 'Bangers', cursive;
  /* background: url( 'https://www.generationcable.net/wp-content/uploads/2017/03/Netflix-Background.jpg') no-repeat center center;
    background-size: cover; */
    /* background-color: red; */
    transform: scale(1.0);
}
</style>
