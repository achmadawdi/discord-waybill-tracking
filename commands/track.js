module.exports = {
	name: 'track',
	description: 'Waybill Tracking',
	execute(message, args){		
		const Discord = require('discord.js');		
		let config = require('../configuration/config.json');
        var axios = require('axios');

		let botMessage = config.message;
		let botConfig = config.bot;		
        let dataMessage = {
            user: message.author.id            
        }             
        
        let last_res = "";
        const replacePlaceholder = (embed,data) =>{			
            if(!data == false){                
                let response = data.response;
                embed.title = embed.title.replace(/{waybill_number}/g,response.result.waybill_number);
                embed.description = embed.description.replace(/{waybill_number}/g,response.result.waybill_number);
                embed.description = embed.description.replace(/{status}/g,`${response.result.last_status.city} \n ${response.result.last_status.date_time}`);
                last_res = response.result.last_status.city;
            }			
			embed.description = embed.description.replace(/{user}/g,`<@${dataMessage.user}>`);            
			return embed;
		}

		const createEmbed = (embed, data ) =>{			
			let MessageEmbed = {
				color: "",				
				author: {
					name: "",
					icon_url: ""
				},				
				description: "",
				timestamp: new Date(),
				footer: {
					text: "",
					icon_url: ""
				}
			}
            return replacePlaceholder({ ...MessageEmbed, ...embed}, data);
		}


		const failedReminder = () =>{
			let configReminder = botMessage.command.embed.reminderError;	
			let MessageEmbed = createEmbed(configReminder, false);
			message.reply("",{ embed: MessageEmbed }).then((msg) => {
				msg.delete({ timeout: botConfig.command.deleteAfterExecuted.miliseccond*5 });								
			});
            return;
		}
		
        const sendMessage = (res, deleteMsg) =>{
            let configReminder = botMessage.command.embed.checkWaybill;	
                let MessageEmbed = createEmbed(configReminder, res);
                message.reply("",{ embed: MessageEmbed }).then((msg) => {
                    if(deleteMsg) msg.delete({ timeout: botConfig.command.track.deleteAfterExecuted.miliseccond });								                    
            });
        }
        const getWaybill = (waybill_number, notify, sendMessageStatus) =>{
            var config = {
                method: 'get',
                url: 'https://content-main-api-production.sicepat.com/public/check-awb/'+waybill_number,
                headers: { }
            };
              
            axios(config)
            .then(function (response) {
                let res = {
                    status : "success",
                    response : response.data.sicepat
                }        
                let deleteMsg = botConfig.command.track.deleteAfterExecuted.enabled;                              
                if(notify == 'true'){
                    let check = 0;
                    let last_res_updated = res.response.result.last_status.city;
                    var interval = setInterval(function() { 
                        if ( last_res_updated == last_res) { 
                            getWaybill(dataMessage.waybill, "false", false);       
                            console.log(`[checkWaybill][${check}] - ${waybill_number} - ${last_res}`);
                        }else{
                            getWaybill(dataMessage.waybill, "false", true);    
                            console.log(`[checkWaybill][${check}] - ${waybill_number} - ${last_res}`);    
                            last_res_updated = last_res;
                        }

                        if (res.response.result.last_status.status == "DELIVERED") {
                            getWaybill(dataMessage.waybill, "false", true);       
                            clearInterval(interval);
                            console.log(`[checkWaybill][${check}] - ${waybill_number} - ${last_res}`);
                        }
                        check++;
                     }, botConfig.command.track.interval.miliseccond);
                     deleteMsg = false;
                }
                if(sendMessageStatus) sendMessage(res, deleteMsg);                                          
                return;
            })
            .catch(function (error) {
                console.log(error);   
                failedReminder();           
            });           
        }    

		try{								
			// Generate data
			const data = args.join(" ").split(" ");  		
			let result = {			
				waybill: data[0],
				notifyChange: data[1]                
			}
			dataMessage = {...dataMessage, ...result};            
			getWaybill(dataMessage.waybill, dataMessage.notifyChange, true);
	  	}
	  	catch(err){  	
			console.log("Error Caused: ",err.message);            
			failedReminder();		
	  	}
	},
};
  	