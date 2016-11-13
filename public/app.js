'use strict';
var loyalbrews = {
  poolId: 'us-east-1:6b1577fe-ad4c-4bef-ae92-b0c1f556c702',
  clientId: '2qn8cbhfrise4sg4l8obocb5bh',
  Paranoia: 7
};

var poolData = {
  UserPoolId: 'us-east-1_O5mjCjW75',
  ClientId: '2qn8cbhfrise4sg4l8obocb5bh'
};

AWSCognito.config.region = 'us-east-1';
var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

var cognitoUser;

loyalbrews.identity = new $.Deferred();

loyalbrews.getUserInfo = function() {
  var deferred = new $.Deferred();
  //userPool
  //var cognitoUser = userPool.getCurrentUser();
  loyalbrews.identity.then(function(identity) {
    cognitoUser.getUserAttributes(function(err, results){
      if (err) {
        console.log('error getting user attributes: ' + err);
        return;
      }
      var userInfo = {};
      results.forEach(function(element, index) {
        if (element['Name'] == 'email') {
          userInfo['email'] = element['Value'];
        } else if (element['Name'] == 'birthdate') {
          userInfo['birthdate'] = element['Value'];
        }
      });
      deferred.resolve(userInfo);
    });
  });
  return deferred;
}

loyalbrews.showView = function(hash, params) {
  console.log('showView: ' + hash);
  var routes = {
    '#login': loyalbrews.loginView,
    '#verification': loyalbrews.verificationView(params),
    '#register': loyalbrews.registerView,
    '#profile': loyalbrews.profileView,
    '': loyalbrews.landingView,
    '#': loyalbrews.landingView
  };
  $('.view-container').empty().append(routes[hash]);
  Materialize.updateTextFields();
}

loyalbrews.landingView = function() {
  return loyalbrews.template('landing-view');
}

loyalbrews.loginView = function() {
  return loyalbrews.template('login-view');
}

loyalbrews.registerView = function() {
  return loyalbrews.template('register-view');
}

loyalbrews.verificationView = function(params) {
  var view = loyalbrews.template('verification-view');
  return view;
}

loyalbrews.profileView = function() {
  var view = loyalbrews.template('profile-view');
  loyalbrews.getUserInfo().then(function(user) {
    view.find('.email').val(user['email']);
    view.find('.birthdate').val(user['birthdate']);
  });
  return view;
}

loyalbrews.template = function(name) {
  return $('.templates .' + name).clone();
}

loyalbrews.appOnReady = function() {
  var params = {};
  var hash;
  console.log('appOnReady');
  window.onhashchange = function() {
    var queryString = window.location.hash.split('?');
    hash = queryString[0];
    var qsArr;
    if (queryString.length > 1){
      var qs = queryString[1].split('&');

      qs.forEach(function(element, index) {
        var keyVal = element.split('=');
        params[keyVal[0]] = keyVal[1];
      });
    }
    loyalbrews.showView(hash, params); 
  };
  loyalbrews.showView(window.location.hash, params);

  //retrieve current user from local storage
  var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
  cognitoUser = userPool.getCurrentUser();

  if (cognitoUser != null) {
    console.log('appOnReady cognitoUser: ' + JSON.stringify(cognitoUser));
    cognitoUser.getSession(function(err, session) {
      if (err) {
         console.log('error getting user session: ' + error);
          return;
      }
      console.log('session validity: ' + session.isValid());
      AWS.config.update({
        region: 'us-east-1',
        credentials: new AWS.CognitoIdentityCredentials({
          IdentityPoolId: loyalbrews.poolId,
          Logins: {
            'cognito-idp.us-east-1.amazonaws.com/us-east-1_O5mjCjW75': session.getIdToken().getJwtToken()
          }
        })
      })

      loyalbrews.awsRefresh().then(function(id) {
        console.log('awsRefresh id: ' + id);
        console.log('about to resolve identity');
        loyalbrews.identity.resolve({
          id: id,
          refresh: loyalbrews.authRefresh
        });
        console.log('identity resolved');
      });
    });
  }
  $('.datepicker').pickadate({
    selectMonths: true, // Creates a dropdown to control month
    selectYears: 80, // Creates a dropdown of 15 years to control year
    max: true
  });
  console.log('end of appOnReady');

  loyalbrews.identity.done(loyalbrews.addProfileLink);

}

loyalbrews.addProfileLink = function(profile) {
  $('.sign-in').text(cognitoUser.username);
  $('.sign-in').attr('href', '#profile');
}

loyalbrews.verify = function(params) {
  //userPool
  console.log('verify params: ' + JSON.stringify(params));
  var userData = {
    Username: params['userName'],
    Pool: userPool
  };

  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
  cognitoUser.confirmRegistration(params['confCode'], true, function(err, result) {
      if (err) {
          console.log('confirm error: ' + err);
          $('.verification-message').text('Verification failed.');
          return;
      }
      console.log('confirm result: ' + result);
      $('.verification-message').text('Your email has been verified!');
  });
}

loyalbrews.loginClick = function() {
  console.log('login click');
  //userPool
  var userName = $('.username').val();
  var password = $('.password').val();
  var userData = {
    Username: userName,
    Pool: userPool
  };

  var authenticationData = {
    Username : userName,
    Password : password
  };
  var authenticationDetails =
  new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

  cognitoUser =
  new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
  cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function (result) {
          //console.log('success! access token' + result.getAccessToken().getJwtToken());
          var id_token = result.getIdToken().getJwtToken();
          var access_token = result.getAccessToken().getJwtToken();
          console.log('auth success id_token: ' + access_token);
          AWS.config.update({
            region: 'us-east-1',
            credentials: new AWS.CognitoIdentityCredentials({
              IdentityPoolId: loyalbrews.poolId,
              Logins: {
                'cognito-idp.us-east-1.amazonaws.com/us-east-1_O5mjCjW75': id_token
              }
            })
          })
          $('.sign-in').text(userName);
          $('.sign-in').attr('href', '#profile');
          console.log('about to call awsRefresh');
          loyalbrews.awsRefresh().then(function(id) {
            console.log('awsRefresh id: ' + id);
            console.log('about to resolve identity');
            loyalbrews.identity.resolve({
              id: id,
              refresh: loyalbrews.authRefresh
            });
            console.log('identity resolved');
          });
      },

      onFailure: function(err) {
          console.log('error: ' + err);
      },
      mfaRequired: function(codeDeliveryDetails) {
          //var verificationCode = prompt('Please input verification code' ,'');
          //cognitoUser.sendMFACode(verificationCode, this);
      }
    });
}

loyalbrews.awsRefresh = function() {
  console.log('awsRefresh called');
  var deferred = new $.Deferred();
  console.log('aws.config.credentials: ' + JSON.stringify(AWS.config.credentials));
  AWS.config.credentials.refresh(function(err) {
    if (err) {
      console.log('error refreshing credentials: ' + err);
      deferred.reject(err);
    } else {
      console.log('awsRefresh: ' + AWS.config.credentials.identityId);
      deferred.resolve(AWS.config.credentials.identityId);
    }
  });
  return deferred.promise();
}

loyalbrews.authRefresh = function() {
  console.log('authRefresh');
  //userPool
  var cognitoUser = userPool.getCurrentUser();

  if (cognitoUser != null) {
    cognitoUser.getSession(function(err, session) {
        if (err) {
            console.log('cognitoUser.getSession ERROR: ' + err);
            return;
        }

        console.log('session validity: ' + session.isValid());
        /*
        userDetails = cognitoUser.getDetails(function(results){

        });
        console.log('cognitoUser: ' + JSON.stringify(cognitoUser.getDetails(function(results))));
        */
    });
  }
}

loyalbrews.registerClick = function() {
  console.log('registerClick');

  //userPool

  var userData = {
    Username: 'strangereon',
    Pool: userPool
  };

  var attributeList = [];
  var userName = $('.username').val();
  var email = $('.email').val();
  var birthDate = $('.birthdate').val();
  var password = $('.password').val();

  console.log('userName: ' + userName);
  console.log('email: ' + email);
  console.log('birthdate: ' + birthDate);
  console.log('password: ' + password);

  var dataEmail = {
    Name: 'email',
    Value: email
  };
  var dataBirthDate = {
    Name: 'birthdate',
    Value: birthDate
  };
  var dataUserName = {
    Name: 'preferred_username',
    Value: userName
  };

  var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
  var attributeBirthDate = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataBirthDate);
  var attributeUserName = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataUserName);

  attributeList.push(attributeEmail);
  attributeList.push(attributeUserName);
  attributeList.push(attributeBirthDate);

  userPool.signUp(userName, password, attributeList, null, function(err, result) {
    if (err) {
      console.log(err);
      return;
    }
    var cognitoUser = result.user;
    console.log('user name is ' + cognitoUser.getUsername());
    console.log('cognitoUser object: ' + JSON.stringify(cognitoUser));
  });

}
