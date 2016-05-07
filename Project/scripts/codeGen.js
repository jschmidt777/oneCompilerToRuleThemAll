//codeGen.js
//4/25/16

//Output the 256 bytes, per program
	var codeArr = []; //holds all of the hexDecArrs, which we create for each program
	var byteIndex = 0;
	var isCodeGenError = false;

	function hexDecArr(){  //num = i + 1 for the for loop
		this.num = 0;
		this.hexCode = new Array(256);
		this.hexCode.fill("00", 0, 256);
		this.tempTable = new tempVarTable();
		this.jumpTable = new tempJumpTable();

		this.toString = function(){
			var outputHex = this.hexCode.join(" ");
			return outputHex;
		}
	}

	function createHexArr(num){
		var hexArr = new hexDecArr();
			hexArr.num = num;
			codeArr.push(hexArr);
	}

 	function createCodeBlocks(){
 		for(i = 0; i < astArr.length; i++){
			createHexArr(i+1);
		}
 	}
		

	var taCodeBlock = null; //after we create the 256 byte blocks for each program, point to the first one 
	//(or the only one if that's the case... there's no way we get this far without at least one valid program).

		function codeGen(){  //modify scypeCheck; recursively decend to traverse the AST one last time to see what code needs to be generated
			//curAST resets after we make the symbol table(s)
					var curBlock = null;
					var curBlockChildren = null;
					var foundRoot = false;
					var alpha = /(a-z)/;
					var string = /([a-z]| )/g;
					var integer = /(\d)/;
					var boolval = /(false|true)/;
					var count = 0;
					var heapPtr = 255; //initialize to the end of the memory. FF.
					//curByte = goToNextByte();
					var fromPrint = false; //Don't use this...
					var longIntPtr = null; //A very similar use in this function like it does in scypeCheck. 
					var curScope = 0;
					var varToVar = false; //when we assign a variable to another variable, we will change the child that is looked at in findTempVar()
					checkBlock(); //fall into the recursion, and when we come out of it, backPatch.
					backPatch();

					function checkBlock(){
						//debugger;
						if(!foundRoot){
							curBlock = curAST.root;
							foundRoot = true;
							curBlockChildren = curBlock.children;
							checkBlockChildren();
						}else{
							//will have to increment to see the scope we are currently in
							curScope++;
							checkBlockChildren();
							//decrement scope
							curScope--;
						}
						
					}

					
					function checkBlockChildren(){ 
						//debugger;
						if(!isCodeGenError){
							if(count < curBlockChildren.length){
								if(curBlockChildren[count].name == "VarDecl"){
									var tempPtr = curBlockChildren;
									curBlockChildren = curBlockChildren[count];
									generateVariable();
									curBlockChildren = tempPtr;
									count++;
									checkBlockChildren();
								}else if(curBlockChildren[count].name == "Assignment"){
									var tempPtr = curBlockChildren;
									curBlockChildren = curBlockChildren[count];
									//debugger;
									generateAssign();
									curBlockChildren = tempPtr;
									count++;
									checkBlockChildren();
								}else if(curBlockChildren[count].name == "Print"){
									var tempPtr = curBlockChildren;
									curBlockChildren = curBlockChildren[count];
									fromPrint = true; //Don't need this I think. REMOVE later if that's still true.
									generatePrint();
									fromPrint = false;
									curBlockChildren = tempPtr;
									count++;
									checkBlockChildren();
								}else if(curBlockChildren[count].name == "If"){
									var tempPtr = curBlockChildren;
									curBlockChildren = curBlockChildren[count];
									generateIfJump();
									var temp = count;
									count = 1;
									curBlockChildren = curBlockChildren.children;
									var beginJump = byteIndex;
									checkBlockChildren();
									var endJump = byteIndex;
									var jumpCalc = endJump - beginJump;
										if(jumpCalc <= 9){
											jumpCalc = "0" + jumpCalc;
										}else{
											jumpCalc = jumpCalc.toString(16);
											jumpCalc = jumpCalc.toUpperCase();
										}
									taCodeBlock.jumpTable.jumps[taCodeBlock.jumpTable.jumps.length-1].distance = jumpCalc;
									curBlockChildren = tempPtr;
									count = temp;
									count++;
									checkBlockChildren();
								}else if(curBlockChildren[count].name == "While"){
									var tempPtr = curBlockChildren;
									curBlockChildren = curBlockChildren[count];
									//generateWhileJump();
									var temp = count;
									count = 1;
									curBlockChildren = curBlockChildren.children;
									checkBlockChildren();
									curBlockChildren = tempPtr;
									count = temp;
									count++;
									checkBlockChildren();
								}else if(curBlockChildren[count].name == "BLOCK"){
									var tempPtr = curBlockChildren;
									var temp = count;
									curBlockChildren = curBlockChildren[count].children;
									count = 0;
									checkBlock();
									curBlockChildren = tempPtr;
									count = temp;
									count++;
									//checkBlockChildren();
								}else{ 

								}
							}
						}
							
					}

					function generatePrint(){
						var taChild = 0; 
						if(fromPrint){
							taChild = 0; // look at the first child since that's what we'll be printing. else... 
						}else{

						}
						//Notes: can print anything, so have to account for strings, ints, bools, and variables
						if(curBlockChildren.children[taChild].name.match(integer)){
							taCodeBlock.hexCode[byteIndex] = "A0"; //load memory with a constant
							byteIndex++;
							var taInt = curBlockChildren.children[taChild].name;
							taInt = "0" + taInt;
							taCodeBlock.hexCode[byteIndex] = taInt;
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "A2";
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "01";
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "FF";
							byteIndex++;
						}else if(curBlockChildren.children[taChild].name.match(string) && curBlockChildren.children[taChild].isString == true){
							//A0 (hex mem location) A2 02 FF
							taCodeBlock.hexCode[byteIndex] = "A0";
							byteIndex++;
							//mem location of the beginning of the string
							taCodeBlock.hexCode[byteIndex] = generateString(curBlockChildren.children[taChild].name);
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "A2";
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "02";
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "FF";
							byteIndex++;	
						}else if(curBlockChildren.children[taChild].name.match(boolval) && curBlockChildren.children[taChild].isString == undefined){
							if(curBlockChildren.children[taChild].name == "true"){
								taCodeBlock.hexCode[byteIndex] = "A0"; //load memory with a constant
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "01";
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "A2";
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "01";
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "FF";
								byteIndex++;
							}else if(curBlockChildren.children[taChild].name == "false"){
								taCodeBlock.hexCode[byteIndex] = "A0"; //load memory with a constant
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "00";
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "A2";
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "01";
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "FF";
								byteIndex++;
							}
						}else if(curBlockChildren.children[taChild].name == "Add"){ //get variables working first, then do this.
								/*longIntPtr = curBlockChildren.children[taChild];
								generateAdd(curBlockChildren.children[taChild]);*/ //fall into some recursion, just like we're checking long int
								//TODO: Once I get variables working, make sure that this function accounts for variables too.
						}else if(curBlockChildren.children[taChild].name.match(/[a-z]/) && curBlockChildren.children[taChild].isString == undefined && !curBlockChildren.children[taChild].name.match(boolval)){
							taCodeBlock.hexCode[byteIndex] = "AC"; 
							byteIndex++;
							var taTempVar = findTempVar();
							taCodeBlock.hexCode[byteIndex] = taTempVar.temp;
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "XX";
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "A2";
							byteIndex++;
							if(taTempVar.isString){
								taCodeBlock.hexCode[byteIndex] = "02";
								byteIndex++;
							}else{
								taCodeBlock.hexCode[byteIndex] = "01";
								byteIndex++;
							}
							taCodeBlock.hexCode[byteIndex] = "FF";
							byteIndex++;
						}
					}

 
					function generateString(str){ //O(n). n based on the length of our string.
						var hexLocale = 255; //the beginning of the string in the heap; defaulted to the end of the heap.
						var hex = "";
						var stringPtr = heapPtr - str.length;
						hexLocale = stringPtr.toString(16);
						hexLocale = hexLocale.toUpperCase();
							for(i = 0; i < str.length; i++) {
								hex += str.charCodeAt(i).toString(16);
							}
						hex = hex.toUpperCase();
						var hexString = hex.split(/(.{2})/); //split up the string after we convert it to hex, and put it in the heap.
						hexString = hexString.filter(function(n){ return n != "" });
							for(i = 0; i < hexString.length; i++) {
								if(taCodeBlock.hexCode[stringPtr] == "00"){  //TODO: Change this to make it say that if it hits the staticPtr (has to be global for this reason) then errorrrr.
									taCodeBlock.hexCode[stringPtr] = hexString[i];
									stringPtr++;
								}else{
									isCodeGenError = true;
									putMessage("Error! Stack OVVVEWWEWREFLOW!");
								}	
							}
						//if we don't get a string with any length, we'll still move the pointer, just for consistency...
						heapPtr = heapPtr - str.length - 1;
						return hexLocale;
					}


					/*function generateAdd(id){ //change this
						if(longIntPtr.children[0].name.match(integer)){
							if(longIntPtr.children[1].name == "Add"){ 
								longIntPtr = longIntPtr.children[1];
								checkLongInt(id);
					}*/

					function generateVariable(){ //if it's we have a new variable of the same name, it must be in a different scope, so note that (MAKE NEW VAR FOR IT)
						if(curBlockChildren.children[0].name == "int" || curBlockChildren.children[0].name == "boolean"){
							//debugger;
							taCodeBlock.hexCode[byteIndex] = "A9"; //load accumulator with zero, then create temp var
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "00"; //Initialize ints to zero and booleans to false. 
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "8D";
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = createTempVar("T"+tempVarCount, curBlockChildren.children[1].name, 0, curScope, false); //The isString property comes in handy when we're printing variables.
							tempVarCount++;
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "XX";
							byteIndex++;
						}else if(curBlockChildren.children[0].name == "string"){
							taCodeBlock.hexCode[byteIndex] = "A9"; //load accumulator with zero, then create temp var
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "FF"; //Strings will get their reference when they are assigned. Otherwise, point to the last byte.
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "8D";
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = createTempVar("T"+tempVarCount, curBlockChildren.children[1].name,0 , curScope, true);
							tempVarCount++;
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "XX";
							byteIndex++;
						}
					}


					function generateAssign(){
						if(curBlockChildren.children[1].name.match(integer)){
							taCodeBlock.hexCode[byteIndex] = "A9"; 
							byteIndex++;
							var taInt = "0" + curBlockChildren.children[1].name;
							taCodeBlock.hexCode[byteIndex] = taInt; 
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "8D";
							byteIndex++;
							//find the temp var and then put it in memory
							var taTempVar = findTempVar();
							taCodeBlock.hexCode[byteIndex] = taTempVar.temp;
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "XX";
							byteIndex++;
						}else if(curBlockChildren.children[1].name.match(string) && curBlockChildren.children[1].isString == true){
							taCodeBlock.hexCode[byteIndex] = "A9";
							byteIndex++;
							//mem location of the beginning of the string
							taCodeBlock.hexCode[byteIndex] = generateString(curBlockChildren.children[1].name);
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "8D";
							byteIndex++;
							var taTempVar = findTempVar();
							taCodeBlock.hexCode[byteIndex] = taTempVar.temp;
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "XX";
							byteIndex++;	
						}else if(curBlockChildren.children[1].name.match(/([a-z])/) && curBlockChildren.children[1].isString == undefined){
							taCodeBlock.hexCode[byteIndex] = "AD";
							byteIndex++;
							varToVar = true;
							var taSecTempVar = findTempVar();    //The values are switched; the variable on the RHS is here.
							taCodeBlock.hexCode[byteIndex] = taSecTempVar.temp;
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "XX";
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "8D";
							byteIndex++;
							var taFirstTempVar = findTempVar();  //The values are switched; the variable being assigned is here.
							taCodeBlock.hexCode[byteIndex] = taFirstTempVar.temp;
							byteIndex++;
							taCodeBlock.hexCode[byteIndex] = "XX";
							byteIndex++;
						}else if(curBlockChildren.children[1].name.match(boolval) && curBlockChildren.children[1].isString == undefined){
							if(curBlockChildren.children[1].name == "true"){
								taCodeBlock.hexCode[byteIndex] = "A9"; 
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "01";
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "8D";
								byteIndex++;
								var taTempVar = findTempVar();
								taCodeBlock.hexCode[byteIndex] = taTempVar.temp;
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "XX";
								byteIndex++;
							}else if(curBlockChildren.children[1].name == "false"){
								taCodeBlock.hexCode[byteIndex] = "A9"; 
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "00";
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "8D";
								byteIndex++;
								var taTempVar = findTempVar();
								taCodeBlock.hexCode[byteIndex] = taTempVar.temp;
								byteIndex++;
								taCodeBlock.hexCode[byteIndex] = "XX";
								byteIndex++;
							}
						}//TODO: Handle long ints in this case, like how I still have to do it for print...
					}


					function generateIfJump(){  //it's going to work a little like in semantic analysis... if it's just a bool, gen for that, otherwise, gen the variable(s) and or the bool.
						if(curBlockChildren.children[0] != undefined){
								if(curBlockChildren.children[0].name.match(boolval) && curBlockChildren.children[1].isString == undefined){
									if(curBlockChildren.children[0].name == "true"){
										taCodeBlock.hexCode[byteIndex] = "A9"; 
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "01";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "8D";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = createTempVar("T"+tempVarCount, curBlockChildren.children[0].name, 0, curScope, false);
										tempVarCount++;
										byteIndex++;									//Essentially create a variable for true or false. Fine since it's only a byte in static space.
										taCodeBlock.hexCode[byteIndex] = "XX";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "A2"; 
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "01";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "EC";
										byteIndex++;
										var taTempVar = findTempVar();
										taCodeBlock.hexCode[byteIndex] = taTempVar.temp;
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "XX";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "D0";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = createTempJump("J"+jumpCount);
										jumpCount++;
										byteIndex++;
									}else if(curBlockChildren.children[0].name == "false"){
										taCodeBlock.hexCode[byteIndex] = "A9"; 
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "01";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "8D";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = createTempVar("T"+tempVarCount, curBlockChildren.children[0].name, 0, curScope, false);
										tempVarCount++;
										byteIndex++;									//Essentially create a variable for true or false. Fine since it's only a byte in static space.
										taCodeBlock.hexCode[byteIndex] = "XX";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "A2"; 
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "01";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "EC";
										byteIndex++;
										var taTempVar = findTempVar();
										taCodeBlock.hexCode[byteIndex] = taTempVar.temp;
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "XX";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = "D0";
										byteIndex++;
										taCodeBlock.hexCode[byteIndex] = createTempJump("J"+jumpCount);
										jumpCount++;
										byteIndex++;
									}
							}else if(curBlockChildren.children[0].children[1] != undefined){
									if(curBlockChildren.children[0].children[1].name.match(alpha)){
										var tempPtr = curBlockChildren;
										curBlockChildren = curBlockChildren.children[0];
										checkAssignment();
										curBlockChildren = tempPtr;
									}
							}else{
								
							}
						}
					}


					function findTempVar(){ //these variables must exist (scope and type checking is successful at this point) so no need to check otherwise
						//debugger;
						var possibleTemps = [];
						var taChild = 0;
						if(varToVar){ //makes this dynamic, and possibly usable in other ways...
							taChild = 1;
						}else{
							taChild = 0;
						}
						for(i = 0; i < taCodeBlock.tempTable.temps.length; i++){
							if(curBlockChildren.children[taChild].name == taCodeBlock.tempTable.temps[i].variable){
								possibleTemps.push(taCodeBlock.tempTable.temps[i]); //The "T" + n value of the variable
							}
						}
						//How this may be modified if I need to fix my small scope problem: make new array and pop until I get the first match. Since they are added as the code comes, this will work, and will return the most recent definition
						//IN A SCOPE THAT has the same level...
						var highestScopeVar = possibleTemps[0]; //we will return the var with respect to the current scope; it's static, so we'll be using the variable most immediate in the code.
						if(possibleTemps.length > 1){
							for(i = 0; i < possibleTemps.length; i++){ //don't really see a sit. where this won't work... hopefully! 
								if(possibleTemps[i].scope <= curScope){
									highestScopeVar = possibleTemps[i];
								}
							}
						}

						varToVar = false;
						return highestScopeVar;
					}



					function backPatch(){
						var staticPtr = findStaticMem(); //the beginning of the static memory
						for(i = 0; i < taCodeBlock.tempTable.temps.length; i++){
							for(j = 0; j < taCodeBlock.hexCode.length; j++){
								if(taCodeBlock.hexCode[j] == "00" && taCodeBlock.hexCode[j+1] == "00"){ 
									staticPtr++;
									break;
								}else if(taCodeBlock.hexCode[j] == taCodeBlock.tempTable.temps[i].temp){
									var temp = staticPtr.toString(16);
									taCodeBlock.hexCode[j] = temp.toUpperCase();
									taCodeBlock.hexCode[j+1] = "00";
								}
							}
						}

						for(i = 0; i < taCodeBlock.jumpTable.jumps.length; i++){
							for(j = 0; j < taCodeBlock.hexCode.length; j++){
								if(taCodeBlock.hexCode[j] == taCodeBlock.jumpTable.jumps[i].jump){
									taCodeBlock.hexCode[j] = taCodeBlock.jumpTable.jumps[i].distance;
								}
							}
						}
					}

					function findStaticMem(){ //locate where we will begin the static space
						var staticPtr = 0; // this will be used to track the beginning of the static memory
						for(i = 0; i < taCodeBlock.hexCode.length; i++){
							if(taCodeBlock.hexCode[i] == "00" && taCodeBlock.hexCode[i+1] == "00"){ //if we get two 00 in a row, then we have found where our static space is
								staticPtr = i + 1;
								return staticPtr;
							}
						}	
					}
		}



	
	var tempVarCount = 0; //this is the number we will concatenate with "T" to make the entry in the temporary variable table
	// RESET THIS WHEN WE HAVE MORE THAN ONE PROGRAM!
	var jumpCount = 0;

	//can just say add in the XX to the next byte after the temp is inserted
	//taCodeBlock.tempTable.createTempVar("T"+tempVarCount, curBlockChildren.children[0].name);
	//tempVarCount++;
	//calculate the static pointer at some point so we know where we're putting these in the memory.

	function tempVarTable(){
		this.temps = [];
	}

	function tempJumpTable(){
		this.jumps = [];
	}

	function createTempVar(temp, variable, address, scope, isString){
			tempVariable = new tempVar();
			tempVariable.temp = temp;
			tempVariable.variable = variable;
			tempVariable.address = address;
			tempVariable.scope = scope;
			tempVariable.isString = isString;
			taCodeBlock.tempTable.temps.push(tempVariable);
			return tempVariable.temp;
	}

	function createTempJump(jump){
			temp_Jump = new tempJump();
			temp_Jump.jump = jump;
			taCodeBlock.jumpTable.jumps.push(temp_Jump);
			return temp_Jump.jump;
	}

	function tempVar(){
		this.temp = "";
		this.variable = "";
		this.address = 0;
		this.scope = 0;
		this.isString = false;
	}

	function tempJump(){
		this.jump = "";
		this.distance = "00";
	}

//Jump table




