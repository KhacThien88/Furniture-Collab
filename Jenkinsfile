pipeline {
  environment {
    PROVIDER_TF = credentials('provider-azure')
    dockerimagename = "ktei8htop15122004/savingaccountfe"
    dockerImage = ""
    DOCKERHUB_CREDENTIALS = credentials('dockerhub')
  }
  agent any 
  stages {
    stage('Check Agent') {
            steps {
                script {
                    echo "Running on agent: ${env.NODE_NAME}"
                }
            }
        }
    stage('Unit Test') {
      when {
        expression {
          return env.BRANCH_NAME != 'master';
        }
      }
      steps {
        echo 'Unit test'
      }
    }
    stage('SonarQube Analysis') {
        steps {
            script {
                def scannerHome = tool 'SonarScanner'
                withSonarQubeEnv('SonarQube') {
                    sh "${scannerHome}/bin/sonar-scanner"
                }
            }
        }
    }
    // stage('Build image') {
    //   steps {
    //       script {
    //         sh 'docker build -t ktei8htop15122004/furniture-app .'
    //       }
    //   }
    // }

    // stage('Pushing Image') {
    //   steps {
    //       script {
    //         sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin'
    //         sh 'docker push ktei8htop15122004/furniture-app'
    //       }
    //   }
    // }
    
  }
}


