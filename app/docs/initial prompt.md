## we want to make a react js app for the backend in @src dir

# this app's main purpose
1. to track cars and collect obd2 port data at regular intervals
2. understand the backend by studying mongoose models inside @src/models


## main ui screens needed
1. login / register 
2. devices list screen
3. device detail screen
4. device detail dashboard - displays all data collected in a table like format with time as rows
5. map in device details screen - shows realtime location if the car 
6. device detail dashbaord - also contains last updated data for device in a modern ui arranged in variable configuration grid
7. ui to add new device

## dir structure
1. nodejs app's code is in root dir
2. react js code is inside @app inside root dir



## main ui story
1. login / register with mobile number, i dont have any sms provider right now, so when a user clicks on send otp , display the otp we have generated in an alert, so user can see the otp, and then enter it, and thus gets verified, 
1.1 we will also have to create otp mongoose model in backend if not already
2. device CRUD apis , if not already created in backend we will have to create it
3. after signin/register all the requests than user makes should contain auth token
3.1 if jwt auth token mechanism not already setup, setup this
4. create new apis for latest device data dashboard view
5. leave a placeholder for map view - we will integrate this once done with all other stuff
6. add new device - this is not functional yet, give a dummy UI, make it a multi step process with steps involving , entereing device id found on packaging, enter otp, verify purchase details and finally register device - dont call any apis in this


# UI STRUCTURE
1. use shadcn, i have shadcn mcp installed
2. use @app/docs/design.json , to create the UI, stick to this reference while creating the UI





## good practices
1. add nodemon to backend
1.1 i will start nodejs server manually in a terminal, so whenever you do any changes , the server will hot reload
2. once you are done, ask me to start react server manually
2.1 if you do any changes, the react will refresh automatically
3. implement UI in phases , ask me to go and verify if major features are working or not
3.1 dont try to one shot the whole ui


## documentaion
1. for backend, any new api you create , create a .md file inside @docs/api, maintain this file for all api routes documentation, 
1.1 your task is to put curl inside this file with basic desctription, use {{base_url}} as base url
1.2 i want to be able to directly copy paste this curl into postman and test the whole backend
1.3 use different values in curl than curl you might hit during testing , so as i dont get object already exists error
2. for frontend, create a sitemap sort of a thing inside @app/docs which gives me overview of the struture of the app from non tech perspective


PHASE 1
1. initialize react js project inside @app
2. create a gitignore and fill it with appropriate values for a react js project


PHASE 2 
1. creating missing nodejs apis as per ui screens


PHASE 3
1. creating UI in multi sub phases
2. create UI and then integreate it


